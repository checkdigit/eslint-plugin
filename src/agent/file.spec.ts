// agent/file.spec.ts

import { strict as assert } from 'node:assert';
import { describe, it } from '@jest/globals';
import {
  getApiFolder,
  getApiIndexPathByFilename,
  getProjectRootFolder,
  getSwaggerPathByIndexFile,
  isApiIndexFile,
} from './file';

describe('file utility functions', () => {
  it('isApiIndexFile', () => {
    assert(isApiIndexFile('/Users/xxx/workspace/src/api/v1/index.ts'));
    assert(!isApiIndexFile('/Users/xxx/workspace/src/api/v1/ping.ts'));
    assert(!isApiIndexFile('/Users/xxx/workspace/src/api/v1/test/index.ts'));
  });

  it('getProjectRootFolder', () => {
    assert.equal(getProjectRootFolder('/Users/xxx/workspace/src/index.ts'), '/Users/xxx/workspace');
    assert.equal(getProjectRootFolder('/Users/xxx/workspace/src/util/pgp.ts'), '/Users/xxx/workspace');
    assert.equal(getProjectRootFolder('/Users/xxx/workspace/src/api/v1/index.ts'), '/Users/xxx/workspace');
    assert.equal(getProjectRootFolder('/Users/xxx/workspace/src/api/v1/ping.ts'), '/Users/xxx/workspace');
    assert.equal(getProjectRootFolder('/Users/xxx/workspace'), '');
  });

  it('getSwaggerPathByIndexFile', () => {
    assert.equal(
      getSwaggerPathByIndexFile('/Users/xxx/workspace/src/api/v1/index.ts'),
      '/Users/xxx/workspace/src/api/v1/swagger.yml',
    );
  });

  it('getApiFolder', () => {
    assert.equal(getApiFolder('src/api/v1/index.ts'), 'src/api/v1');
    assert.equal(getApiFolder('src/api/v1/ping.ts'), 'src/api/v1');
    assert.equal(getApiFolder('src/api/v1/service/abc.ts'), 'src/api/v1');

    assert.equal(getApiFolder('/Users/xxx/workspace/src/api/v1/index.ts'), '/Users/xxx/workspace/src/api/v1');
    assert.equal(getApiFolder('/Users/xxx/workspace/src/api/v1/ping.ts'), '/Users/xxx/workspace/src/api/v1');
    assert.equal(getApiFolder('/Users/xxx/workspace/src/api/v1/service/abc.ts'), '/Users/xxx/workspace/src/api/v1');

    assert.equal(getApiFolder('/Users/xxx/workspace/src/abc.ts'), undefined);
  });

  it('getApiIndexPathByFilename', () => {
    assert.equal(getApiIndexPathByFilename('/Users/xxx/workspace/src/api/v1/ping.ts'), './index');
    assert.equal(getApiIndexPathByFilename('/Users/xxx/workspace/src/api/v1/service/abc.ts'), '../index');
    assert.equal(getApiIndexPathByFilename('/Users/xxx/workspace/src/api/v1/service/util/abc.ts'), '../../index');
  });
});
