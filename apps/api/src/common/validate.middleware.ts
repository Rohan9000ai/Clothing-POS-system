/**
 * Express middleware that validates req.body (or query/params) against a
 * Zod schema, throwing a proper InputError (400) with details on failure
 * instead of letting bad data reach a service/repository.
 */

import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { InputError } from "./errors";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.flatten();
      return next(
        new InputError(
          "VALIDATION_FAILED",
          "errors.input.validation",
          "One or more fields are invalid.",
          { fieldErrors: details.fieldErrors, formErrors: details.formErrors }
        )
      );
    }

    // Replace with the parsed (and type-coerced/defaulted) data.
    req[target] = result.data;
    next();
  };
}