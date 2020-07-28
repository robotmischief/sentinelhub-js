import { S2L1CLayer, ApiType } from '../../index';
import '../../../jest-setup';

test.each([
  ['https://services.sentinel-hub.com/configuration/v1/datasets/S2L1C/dataproducts/99999', false],
  ['https://services.sentinel-hub.com/configuration/v1/datasets/S2L1C/dataproducts/643', true],
])(
  'AbstractSentinelHubV3Layer.supportsApiType correctly handles DataProducts supported by Processing API',
  (dataProduct, expectedResult) => {
    const layer = new S2L1CLayer({
      dataProduct: dataProduct,
    });
    expect(layer.supportsApiType(ApiType.PROCESSING)).toBe(expectedResult);
  },
);