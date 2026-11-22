import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Read path aliases from tsconfig.json.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);

const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  testRegex: String.raw`.*\.spec\.ts$`,

  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  moduleNameMapper: {
    // Resolve generated Prisma imports ending in .js to their .ts files.
    '^(\\.{1,2}/.*)\\.js$': '$1',

    ...pathsToModuleNameMapper(paths, {
      prefix: '<rootDir>/',
    }),
  },

  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    'apps/**/*.(t|j)s',
  ],

  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
