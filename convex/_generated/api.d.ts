/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as briefs from "../briefs.js";
import type * as buildStatus from "../buildStatus.js";
import type * as dev from "../dev.js";
import type * as fileVersions from "../fileVersions.js";
import type * as files from "../files.js";
import type * as messages from "../messages.js";
import type * as projects from "../projects.js";
import type * as suggestions from "../suggestions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  briefs: typeof briefs;
  buildStatus: typeof buildStatus;
  dev: typeof dev;
  fileVersions: typeof fileVersions;
  files: typeof files;
  messages: typeof messages;
  projects: typeof projects;
  suggestions: typeof suggestions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
