// openapi/generate-schema.ts

import { strict as assert } from 'node:assert';
import { promises as fs } from 'node:fs';

import debug from 'debug';
import { getReasonPhrase } from 'http-status-codes';
import pointer from 'json-pointer';
import jsYaml from 'js-yaml';
import type { OpenAPIV3_1 as v31 } from 'openapi-types';
import type { SchemaObject } from 'ajv/dist/2020';

export const commandName = 'generate-schema';
export { generateSchemasForService } from './service-schema-generator.ts';

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
  request: SchemaObject;
  responses: Record<string, SchemaObject>;
}

export interface ApiSchemas {
  apis: Record<string, Record<string, OperationSchemas>>;
  definitions?: Record<string, SchemaObject>;
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

  const parameters = getParameters(operation.parameters, document).filter(
    (parameter) => parameter.in === parameterType,
  );
  if (parameters.length === 0) {
    return;
  }

  const parametersSchema = Object.fromEntries(
    parameters.map((parameter) => [
      parameterType === 'header' ? parameter.name.toLowerCase() : parameter.name,
      parameter.schema ?? { type: 'string' as const },
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
  const schema = Object.values(contents ?? {})[0]?.schema;
  return schema !== undefined && Object.keys(schema).length > 0 ? schema : undefined;
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
    Object.entries(resolvedHeaders).map(([name, header]) => [name, header.schema ?? { type: 'string' as const }]),
  );
  const requiredHeaderNames = Object.entries(resolvedHeaders)
    .filter(([, header]) => header.required === true)
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
  while (operationIds.has(`${operationId}${operationIdIndex.toString()}`)) {
    operationIdIndex += 1;
  }
  return `${operationId}${operationIdIndex.toString()}`;
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

function getFirehoseLoggedExtension(obj: object): unknown {
  const record = obj as Record<string, unknown>;
  return record['x-firehose-logged'] ?? record['x-firehoseLogged'];
}

function buildApiSchemaFromDocument(
  document: v31.Document,
  organization: string,
  serviceName: string,
): ApiSchemas | null {
  if (document.paths === undefined) {
    return null;
  }
  const serverUri = document.servers?.[0]?.url;
  if (serverUri === undefined) {
    return null;
  }
  const serverPathname = serverUri.startsWith('http') ? new URL(serverUri).pathname : serverUri;
  const endpointSchemasBaseUri = `https://${serviceName}.${organization}${serverPathname}/schemas`;
  const apiSchemasBaseUri = `${endpointSchemasBaseUri}/api`;
  const apiSchemas: Record<string, Record<string, OperationSchemas>> = {};
  const allSchemas: ApiSchemas = { apis: apiSchemas };
  const operationIds = new Set<string>();
  const documentFirehoseLogged = getFirehoseLoggedExtension(document);
  log('document firehose logged value', documentFirehoseLogged);

  for (const [path, pathItems] of Object.entries(document.paths)) {
    // convert openapi path to koa router path, e.g. "/user/{userId}" --> "/user/:userId"
    const koaPath = path.replaceAll(/\{(?<param>[^}]+)\}/gu, ':$<param>');
    const pathSchemas: Record<string, OperationSchemas> = {};
    apiSchemas[`${serverPathname}${koaPath}`] = pathSchemas;

    for (const method of ALL_OPERATION_METHODS) {
      const operation = pathItems?.[method];
      if (operation !== undefined) {
        const operationFirehoseLogged = getFirehoseLoggedExtension(operation);
        log('operation firehose logged value', operationFirehoseLogged);
        const effectiveFirehoseLogged = operationFirehoseLogged ?? documentFirehoseLogged;
        if (effectiveFirehoseLogged !== true) {
          continue;
        }
        const operationId = getOperationId(path, method, operation, operationIds);
        operationIds.add(operationId);
        pathSchemas[method] = {
          request: getRequestContextSchema(method, operation, operationId, document, apiSchemasBaseUri),
          responses: getResponseContextSchemas(operation, operationId, document, apiSchemasBaseUri),
        };
      }
    }
  }

  if (document.components?.schemas !== undefined) {
    allSchemas.definitions = Object.fromEntries(
      Object.entries(document.components.schemas).map(([name, schema]) => [
        name,
        { $schema: JSON_SCHEMA_META_2020_URL, $id: `${endpointSchemasBaseUri}/definitions/${name}`, ...schema },
      ]),
    );
  }

  const relativeSchemaDefinitionReferenceUri = `${serverPathname}/schemas/definitions/`;
  return updateOpenapiSchemaDefinitionsReferences(
    structuredClone(allSchemas),
    relativeSchemaDefinitionReferenceUri,
  ) as ApiSchemas;
}

export function buildApiSchemaFromYaml(
  yamlContent: string,
  organization: string,
  serviceName: string,
): ApiSchemas | null {
  // eslint-disable-next-line import/no-named-as-default-member
  const document = jsYaml.load(yamlContent) as v31.Document;
  return buildApiSchemaFromDocument(document, organization, serviceName);
}

async function generateEndpointSchemas(
  organization: string,
  serviceName: string,
  root: string,
  endpoint: string,
): Promise<void> {
  const documentContents = await fs.readFile(`${root}/${endpoint}/swagger.yml`, 'utf8');
  // eslint-disable-next-line import/no-named-as-default-member
  const document = (await jsYaml.load(documentContents)) as v31.Document;
  const normalizedApiSchemas = buildApiSchemaFromDocument(document, organization, serviceName);
  if (normalizedApiSchemas === null) {
    return;
  }
  const swaggerSchemaFilename = `${root}/${endpoint}/${SWAGGER_SCHEMA_FILENAME}`;
  await fs.writeFile(swaggerSchemaFilename, JSON.stringify(normalizedApiSchemas, undefined, 2));
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
