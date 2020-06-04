import { CancelToken, isCancelled, RequestConfiguration } from './cancelRequests';

export const ensureTimeout = async (
  innerFunction: (requestConfig: RequestConfiguration) => Promise<any>,
  reqConfig?: RequestConfiguration,
): Promise<any> => {
  if (!reqConfig) {
    const innerResult = await innerFunction(reqConfig);
    return innerResult;
  }

  const { cancelToken, timeout } = reqConfig;

  if (!timeout) {
    const innerResult = await innerFunction(reqConfig);
    return innerResult;
  }

  if (!cancelToken) {
    const token = new CancelToken();
    reqConfig.cancelToken = token;
  }

  const timer = setTimeout(() => {
    reqConfig.cancelToken.cancel();
    clearTimeout(timer);
  }, timeout);

  try {
    const resolvedValue = await innerFunction(reqConfig);
    clearTimeout(timer);
    return resolvedValue;
  } catch (e) {
    if (isCancelled(e)) {
      clearTimeout(timer);
      return null;
    } else {
      clearTimeout(timer);
      throw e;
    }
  }
};
