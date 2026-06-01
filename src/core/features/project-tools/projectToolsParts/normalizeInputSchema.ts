import path from 'node:path';

import { ProjectToolDiagnostic } from './ProjectToolDiagnostic';
import { isRecord } from './isRecord';
import { isStringSchema } from './isStringSchema';
import { toDiagnostic } from './toDiagnostic';
import { uniqueStrings } from './uniqueStrings';

export function normalizeInputSchema(
  value: unknown,
  definitionPath: string,
  toolId: string
): { schema?: Record<string, unknown>; diagnostics: ProjectToolDiagnostic[] } {
  const diagnostics: ProjectToolDiagnostic[] = [];
  let schema: unknown = value;

  if (typeof value === 'string') {
    try {
      schema = value.trim() ? JSON.parse(value) : undefined;
    } catch (error) {
      diagnostics.push(toDiagnostic('projectTool.inputSchemaInvalid', error, definitionPath, toolId));
      return { diagnostics };
    }
  }

  if (!isRecord(schema)) {
    diagnostics.push({
      code: 'projectTool.inputSchemaMissing',
      message: 'Project tool must define input_schema as a JSON object schema.',
      path: definitionPath,
      toolId
    });
    return { diagnostics };
  }

  if (schema.type !== 'object') {
    diagnostics.push({
      code: 'projectTool.inputSchemaInvalid',
      message: 'Project tool input_schema.type must be "object".',
      path: definitionPath,
      toolId
    });
  }

  const properties = isRecord(schema.properties) ? { ...schema.properties } : undefined;
  if (!properties) {
    diagnostics.push({
      code: 'projectTool.inputSchemaInvalid',
      message: 'Project tool input_schema.properties must be an object.',
      path: definitionPath,
      toolId
    });
  }

  const required = Array.isArray(schema.required) ? schema.required.filter((item) => typeof item === 'string') : [];
  if (properties?.reason && !isStringSchema(properties.reason)) {
    diagnostics.push({
      code: 'projectTool.reasonInvalid',
      message: 'Project tool reason property must be a string schema.',
      path: definitionPath,
      toolId
    });
  }
  if (properties?.nextStep && !isStringSchema(properties.nextStep)) {
    diagnostics.push({
      code: 'projectTool.nextStepInvalid',
      message: 'Project tool nextStep property must be a string schema.',
      path: definitionPath,
      toolId
    });
  }

  if (diagnostics.length || !properties) {
    return { diagnostics };
  }

  properties.reason ||= {
    type: 'string',
    description: 'A short explanation of why this project tool call is needed.'
  };
  properties.nextStep ||= {
    type: 'string',
    description: 'A short explanation of how this result will be used and what will be done next.'
  };

  return {
    diagnostics,
    schema: {
      ...schema,
      type: 'object',
      properties,
      required: uniqueStrings(['reason', 'nextStep', ...required]),
      additionalProperties: schema.additionalProperties === undefined ? false : schema.additionalProperties
    }
  };
}
