const configuredSiteBasePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH?.trim() ?? "";

function normalizeBasePath(basePath: string) {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

export function resolveSitePath(path: string, basePath = configuredSiteBasePath) {
  if (!path || /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }

  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  if (!normalizedBasePath || normalizedPath === normalizedBasePath || normalizedPath.startsWith(`${normalizedBasePath}/`)) {
    return normalizedPath;
  }
  return `${normalizedBasePath}${normalizedPath}`;
}

export function sitePath(path: string) {
  return resolveSitePath(path);
}
