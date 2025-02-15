// openapi/generate-schema.ts

import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';

import debug from 'debug';
import { getReasonPhrase } from 'http-status-codes';
import pointer from 'json-pointer';
import jsYaml from 'js-yaml';
import type { OpenAPIV3_1 as v31 } from 'openapi-types';
import type { AnySchemaObject } from 'ajv/dist/2020';

export const commandName = 'generate-schema';
const log = debug('openapi-cli:generate-schema');

const ALL_OPERATION_METHODS = ['get', 'put', 'post', 'head', 'trace', 'patch', 'delete', 'options'] as const;
const JSON_SCHEMA_META_2020_URL = 'https://json-schema.org/draft/2020-12/schema';
const OPENAPI_SCHEMA_DEFINITIONS_REFERENCE_URI_BASE = '#/components/schemas/';
export const SWAGGER_SCHEMA_FILENAME = 'swagger.schema.json';

export type HttpMethod = (typeof ALL_OPERATION_METHODS)[number];

export interface RequestContext {
  headers?: Record<string, string>;
  body?: unknown;
  params?: unknown;
  query?: unknown;
}

export interface ResponseContext {
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ApiOperation {
  path: string;
  method: string;
  operationId: string;
  request: RequestContext;
  responses: Record<string, ResponseContext>;
}

export interface OperationSchemas {
  request: AnySchemaObject;
  responses: Record<string, AnySchemaObject>;
}

export interface ApiSchemas {
  apis: Record<string, Record<string, OperationSchemas>>;
  definitions?: Record<string, AnySchemaObject>;
}

function isRequestBodyAllowed(method: string): boolean {
  return ['post', 'put', 'patch'].includes(method);
}

function isReferenceObject(schema: unknown): schema is v31.ReferenceObject {
  return Object.hasOwn(schema as v31.ReferenceObject, '$ref');
}

function resolve<T>(document: v31.Document, reference: v31.ReferenceObject | T): T {
  if (!isReferenceObject(reference)) {
    return reference;
  }

  const referencePointer = reference.$ref.slice(1);
  const resolvedReference = pointer.get(document, referencePointer) as T | v31.ReferenceObject;
  return resolve(document, resolvedReference);
}

function getParameters(
  parameters: (v31.ParameterObject | v31.ReferenceObject)[],
  document: v31.Document,
): v31.ParameterObject[] {
  return parameters.map((parameter) => resolve(document, parameter));
}

function getRequestParametersSchema(
  operation: v31.OperationObject,
  parameterType: string,
  document: v31.Document,
): v31.SchemaObject | undefined {
  if (operation.parameters === undefined) {
    return;
  }

  let parameters = getParameters(operation.parameters, document);
  parameters = parameters.filter((parameter) => parameter.in === parameterType);
  if (parameters.length === 0) {
    return;
  }

  const parametersSchema = Object.fromEntries(
    parameters.map((parameter) => [
      parameterType === 'header' ? parameter.name.toLowerCase() : parameter.name,
      parameter.schema ?? ({ type: 'string' } as v31.SchemaObject),
    ]),
  );
  const requiredParameterNames = parameters
    .filter((parameter) => parameter.required === true)
    .map((parameter) => parameter.name);
  const schema: v31.SchemaObject = {
    type: 'object',
    // header parameters can have additional properties, we allow them in the runtime validation
    additionalProperties: parameterType === 'header',
    properties: parametersSchema,
    ...(requiredParameterNames.length > 0 ? { required: requiredParameterNames } : {}),
  };
  return schema;
}

function getBodySchema(contents: Record<string, v31.MediaTypeObject> | undefined): v31.SchemaObject | undefined {
  if (contents === undefined) {
    return undefined;
  }

  const schema = Object.values(contents)[0]?.schema;
  if (schema !== undefined && Object.keys(schema).length === 0) {
    // empty schema should be treated as undefined
    return undefined;
  }

  return schema;
}

function getRequestBodySchema(operation: v31.OperationObject, document: v31.Document) {
  if (!Object.hasOwn(operation, 'requestBody')) {
    return {
      isRequestBodyRequired: false,
      requestBodySchema: undefined,
    };
  }

  const requestBody = resolve(document, operation.requestBody);
  return {
    isRequestBodyRequired: requestBody?.required,
    requestBodySchema: getBodySchema(requestBody?.content),
  };
}

function getRequestContextSchema(
  method: HttpMethod,
  operation: v31.OperationObject,
  operationId: string,
  document: v31.Document,
  apiSchemasBaseUri: string,
) {
  const requestPathParametersSchema = getRequestParametersSchema(operation, 'path', document);
  const requestQueryParametersSchema = getRequestParametersSchema(operation, 'query', document);
  const requestHeadersSchema = getRequestParametersSchema(operation, 'header', document);

  const { requestBodySchema, isRequestBodyRequired } = getRequestBodySchema(operation, document);
  if (requestBodySchema !== undefined && !isRequestBodyAllowed(method)) {
    throw new Error(`Request body is not allowed for ${method} method`);
  }

  const responseContextSchemaName = `${operationId}RequestContext`;
  // eslint-disable-next-line sonarjs/prefer-immediate-return
  const requestContextSchema = {
    $schema: JSON_SCHEMA_META_2020_URL,
    $id: `${apiSchemasBaseUri}/${responseContextSchemaName}`,
    type: 'object',
    properties: {
      ...(requestPathParametersSchema ? { params: requestPathParametersSchema } : {}),
      ...(requestQueryParametersSchema ? { params: requestQueryParametersSchema } : {}),
      headers: requestHeadersSchema ?? { type: 'object', additionalProperties: true },
      ...(requestBodySchema ? { body: requestBodySchema } : {}),
    },
    required: [
      ...(requestPathParametersSchema?.required ? ['params'] : []),
      ...(requestQueryParametersSchema?.required ? ['query'] : []),
      ...(requestHeadersSchema?.required ? ['headers'] : []),
      ...(isRequestBodyRequired === true ? ['body'] : []),
    ],
    additionalProperties: false,
  };

  return requestContextSchema;
}

function getResponseReason(status: string): string {
  return status === 'default' ? `Default` : getReasonPhrase(status).replaceAll(/\s/gu, ''); // remove spaces
}

function getResponseBodySchema(response: v31.ResponseObject) {
  return getBodySchema(response.content);
}

function getResponseHeadersSchema(
  headers: Record<string, v31.HeaderObject> | undefined,
  document: v31.Document,
): v31.SchemaObject | undefined {
  if (headers === undefined || Object.keys(headers).length === 0) {
    return undefined;
  }

  const resolvedHeaders = Object.fromEntries(
    Object.entries(headers).map(([name, header]) => [name.toLowerCase(), resolve(document, header)]),
  );
  const resolvedHeaderSchemas = Object.fromEntries(
    Object.entries(resolvedHeaders).map(([name, header]) => [
      name,
      header.schema ?? ({ type: 'string' } as v31.SchemaObject),
    ]),
  );
  const requiredHeaderNames = Object.entries(resolvedHeaders)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_name, header]) => header.required === true)
    .map(([name]) => name);
  return {
    type: 'object',
    properties: resolvedHeaderSchemas,
    ...(requiredHeaderNames.length === 0 ? {} : { required: requiredHeaderNames }),
  };
}

function getResponseSchema(
  status: string,
  response: v31.ResponseObject | v31.ReferenceObject,
  document: v31.Document,
  apiSchemasBaseUri: string,
  operationId: string,
) {
  const resolvedResponse = resolve(document, response);
  const responseBodySchema = getResponseBodySchema(resolvedResponse);
  const responseHeadersSchema = getResponseHeadersSchema(resolvedResponse.headers, document);

  const schemaName = `${operationId}Response${getResponseReason(status)}`;
  return {
    $schema: JSON_SCHEMA_META_2020_URL,
    $id: `${apiSchemasBaseUri}/${schemaName}`,
    type: 'object',
    properties: {
      headers: responseHeadersSchema ?? { type: 'object', additionalProperties: true },
      ...(responseBodySchema ? { body: responseBodySchema } : {}),
    },
    required: [
      ...(responseHeadersSchema?.required !== undefined && responseHeadersSchema.required.length > 0
        ? ['headers']
        : []),
      ...(responseBodySchema ? ['body'] : []),
    ],
    additionalProperties: false,
  };
}

function getResponseContextSchemas(
  operation: v31.OperationObject,
  operationId: string,
  document: v31.Document,
  apiSchemasBaseUri: string,
) {
  assert.ok(operation.responses !== undefined, 'Operation responses must be defined');
  return Object.fromEntries(
    Object.entries(operation.responses).map(([status, response]) => [
      status.toLowerCase(),
      getResponseSchema(status.toLowerCase(), response, document, apiSchemasBaseUri, operationId),
    ]),
  );
}

function getOperationId(
  path: string,
  method: string,
  operation: v31.OperationObject,
  operationIds: Set<string>,
): string {
  const operationIdBase = operation.operationId ?? `${path}-${method}`;
  const parts = operationIdBase.split(/[-=/]/u); // split operationId into parts by -, =, or /

  const operationId = parts
    .filter((part) => part.trim() !== '' && !/\{.*\}/u.test(part)) // keep only non-empty parts that are not path parameters
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('');
  if (!operationIds.has(operationId)) {
    return operationId;
  }

  // KISS, we could try to to come up with a better naming convension in case of name collision, but it's probably better to leave it to the service to decide a appropriate operationId
  let operationIdIndex = 1;
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  while (operationIds.has(`${operationId}${operationIdIndex}`)) {
    operationIdIndex += 1;
  }
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${operationId}${operationIdIndex}`;
}

function updateOpenapiSchemaDefinitionsReferences(
  value: unknown,
  relativeSchemaDefinitionReferenceUri: string,
  key?: string,
): unknown {
  if (typeof value === 'string' && key === '$ref' && value.startsWith(OPENAPI_SCHEMA_DEFINITIONS_REFERENCE_URI_BASE)) {
    return value.replace(OPENAPI_SCHEMA_DEFINITIONS_REFERENCE_URI_BASE, relativeSchemaDefinitionReferenceUri);
  }

  if (Array.isArray(value)) {
    return value.map((item) => updateOpenapiSchemaDefinitionsReferences(item, relativeSchemaDefinitionReferenceUri));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        updateOpenapiSchemaDefinitionsReferences(childValue, relativeSchemaDefinitionReferenceUri, childKey),
      ]),
    );
  }

  return value;
}

async function generateEndpointSchemas(
  organization: string,
  serviceName: string,
  root: string,
  endpoint: string,
): Promise<void> {
  const swaggerFile = `${root}/${endpoint}/swagger.yml`;
  const documentContents = await fs.readFile(swaggerFile, 'utf8');
  const document = (await jsYaml.load(documentContents)) as v31.Document;
  if (!document.paths) {
    return undefined;
  }

  const apiSchemas: Record<string, Record<string, OperationSchemas>> = {};
  const allSchemas: ApiSchemas = { apis: apiSchemas };
  const serverUri = document.servers?.[0]?.url;
  assert.ok(serverUri !== undefined, 'Server URI must be defined');
  const serverPathname = serverUri.startsWith('http') ? new URL(serverUri).pathname : serverUri;
  const endpointSchemasBaseUri = `https://${serviceName}.${organization}${serverPathname}/schemas`;
  const apiSchemasBaseUri = `${endpointSchemasBaseUri}/api`;
  const operationIds = new Set<string>();

  for (const [path, pathItems] of Object.entries(document.paths)) {
    // convert openapi path to koa router path, e.g.
    //   "/user/{userId}" --> like "/user/:userId"
    // eslint-disable-next-line prefer-named-capture-group
    const koaPath = path.replaceAll(/\{([^}]+)\}/gu, ':$1');
    const pathSchemas: Record<string, OperationSchemas> = {};
    apiSchemas[`${serverPathname}${koaPath}`] = pathSchemas;

    for (const method of ALL_OPERATION_METHODS) {
      const operation = pathItems?.[method];
      if (operation !== undefined) {
        const operationId = getOperationId(path, method, operation, operationIds);
        operationIds.add(operationId);
        const requestContextSchema = getRequestContextSchema(
          method,
          operation,
          operationId,
          document,
          apiSchemasBaseUri,
        );
        const responseContextSchemas = getResponseContextSchemas(operation, operationId, document, apiSchemasBaseUri);
        pathSchemas[method] = {
          request: requestContextSchema,
          responses: responseContextSchemas,
        };
      }
    }
  }

  if (document.components?.schemas) {
    allSchemas.definitions = Object.fromEntries(
      Object.entries(document.components.schemas).map(([name, schema]) => [
        name,
        {
          $schema: JSON_SCHEMA_META_2020_URL,
          $id: `${endpointSchemasBaseUri}/definitions/${name}`,
          ...schema,
        },
      ]),
    );
  }

  // normalize relative schema reference URIs
  const relativeSchemaDefinitionReferenceUri = `${serverPathname}/schemas/definitions/`;
  const normalizedApiSchemas = updateOpenapiSchemaDefinitionsReferences(
    structuredClone(allSchemas),
    relativeSchemaDefinitionReferenceUri,
  );

  // persist the generated schema
  const schemaContents = JSON.stringify(normalizedApiSchemas, undefined, 2);
  const swaggerSchemaFilename = `${root}/${endpoint}/${SWAGGER_SCHEMA_FILENAME}`;
  await fs.writeFile(swaggerSchemaFilename, schemaContents);
  log(`Generated schema ${swaggerSchemaFilename}`);
}

export async function generateSchemas(): Promise<void> {
  const serviceJsonPackageFile = await fs.readFile(`./package.json`, 'utf8');
  const packageJson = JSON.parse(serviceJsonPackageFile) as {
    name: string;
    service: {
      api: {
        root: string;
        endpoints: string[];
      };
    };
  };

  // assume that the package name is in the format of `@organization/service-name`
  const [organization, serviceName] = packageJson.name.slice(1).split('/');
  assert.ok(organization !== undefined && serviceName !== undefined, 'Invalid package name');

  await Promise.all(
    packageJson.service.api.endpoints.map((endpoint) =>
      generateEndpointSchemas(organization, serviceName, packageJson.service.api.root, endpoint),
    ),
  );
}
