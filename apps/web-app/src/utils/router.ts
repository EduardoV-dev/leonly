type QueryParams = Promise<{ [x in string]: string | string[] | undefined }> | undefined;

type GetQueryParamsResult = {
  [x in string]: string | undefined;
};

/**
 * Utility function to extract specific query parameters from the searchParams object.
 * @param searchParams - A promise that resolves to an object containing query parameters.
 * @param paramsToExtract - An array of strings representing the keys of the parameters to extract.
 * @returns An object containing the extracted parameters and their values.
 */
export const getQueryParams = async (
  searchParams: QueryParams,
  paramsToExtract: string[],
): Promise<GetQueryParamsResult> => {
  if (!searchParams || paramsToExtract.length === 0) {
    return {};
  }

  const params = await searchParams;
  const extractedParams: GetQueryParamsResult = {};

  for (const param of paramsToExtract) {
    extractedParams[param] = Array.isArray(params?.[param]) ? params[param][0] : params?.[param];
  }

  return extractedParams;
};
