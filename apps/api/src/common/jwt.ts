import jwt from "jsonwebtoken";
import { env } from "./env";

export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: string;
  fullName: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.authSecret, {
    expiresIn: env.authTokenExpiry as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.authSecret) as JwtPayload;
}