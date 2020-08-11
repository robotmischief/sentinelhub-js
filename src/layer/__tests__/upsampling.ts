import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { ApiType, CacheTarget, Interpolator, S2L2ALayer, setAuthToken, MosaickingOrder } from '../../index';
import { ProcessingPayload, ProcessingPayloadDatasource } from '../processing';

import '../../../jest-setup';
import { constructFixture } from './fixtures.upsampling';

const extractInputDataFromPayload = (payload: ProcessingPayload): any => {
  const data: ProcessingPayloadDatasource[] = payload.input.data;
  const processingPayloadDatasource: ProcessingPayloadDatasource = data[0];
  return processingPayloadDatasource;
};

test('Upsampling is not set in constructor', async () => {
  const layerS2L2A = new S2L2ALayer({
    instanceId: 'INSTANCE_ID',
    layerId: 'LAYER_ID',
  });

  expect(layerS2L2A.upsampling).toBeNull();
});

test('Upsampling can be set in constructor', async () => {
  const layerS2L2A = new S2L2ALayer({
    instanceId: 'INSTANCE_ID',
    layerId: 'LAYER_ID',
    upsampling: Interpolator.BICUBIC,
  });

  expect(layerS2L2A.upsampling).toBe(Interpolator.BICUBIC);
});

test('Upsampling can be changed', async () => {
  const layerS2L2A = new S2L2ALayer({
    instanceId: 'INSTANCE_ID',
    layerId: 'LAYER_ID',
    upsampling: Interpolator.BICUBIC,
  });
  expect(layerS2L2A.upsampling).toBe(Interpolator.BICUBIC);
  layerS2L2A.upsampling = Interpolator.NEAREST;
  expect(layerS2L2A.upsampling).toBe(Interpolator.NEAREST);
});

test('Upsampling can be set to null', async () => {
  const layerS2L2A = new S2L2ALayer({
    instanceId: 'INSTANCE_ID',
    layerId: 'LAYER_IDw',
    upsampling: Interpolator.BICUBIC,
  });
  expect(layerS2L2A.upsampling).toBe(Interpolator.BICUBIC);
  layerS2L2A.upsampling = null;
  expect(layerS2L2A.upsampling).toBeNull();
});

test('Upsampling when making wms requests', async () => {
  const layerS2L2A = new S2L2ALayer({
    instanceId: 'INSTANCE_ID',
    layerId: 'LAYER_ID',
  });

  const { getMapParams } = constructFixture();
  const mockNetwork = new MockAdapter(axios);
  mockNetwork.reset();
  mockNetwork.onGet().reply(200);
  expect(layerS2L2A.upsampling).toBeNull();

  await layerS2L2A.getMap(getMapParams, ApiType.WMS);
  expect(mockNetwork.history.get.length).toBe(1);
  expect(mockNetwork.history.get[0].url).not.toHaveQueryParams(['upsampling']);

  layerS2L2A.upsampling = Interpolator.BICUBIC;
  await layerS2L2A.getMap(getMapParams, ApiType.WMS);
  expect(mockNetwork.history.get.length).toBe(2);
  const { url } = mockNetwork.history.get[1];
  expect(url).toHaveQueryParams(['upsampling']);
  expect(url).toHaveQueryParamsValues({ upsampling: Interpolator.BICUBIC });
});

test('Upsampling is set from layer when using processing api', async () => {
  const layerS2L2A = new S2L2ALayer({
    instanceId: 'INSTANCE_ID',
    layerId: 'LAYER_ID',
  });

  const { getMapParams, mockedLayersResponse } = constructFixture();

  const mockNetwork = new MockAdapter(axios);
  mockNetwork.reset();
  mockNetwork.onGet().reply(200, mockedLayersResponse);
  mockNetwork.onPost().reply(200);
  setAuthToken('Token');
  expect(layerS2L2A.upsampling).toBeNull();
  await layerS2L2A.getMap(getMapParams, ApiType.PROCESSING);
  expect(mockNetwork.history.post.length).toBe(1);
  let { processing } = extractInputDataFromPayload(JSON.parse(mockNetwork.history.post[0].data));
  expect(processing.upsampling).toBe(Interpolator.BICUBIC);
  expect(layerS2L2A.upsampling).toBe(Interpolator.BICUBIC);

  processing = null;
  layerS2L2A.upsampling = Interpolator.NEAREST;
  await layerS2L2A.getMap(getMapParams, ApiType.PROCESSING);
  processing = extractInputDataFromPayload(JSON.parse(mockNetwork.history.post[1].data)).processing;
  expect(mockNetwork.history.post.length).toBe(2);
  expect(processing.upsampling).toBe(Interpolator.NEAREST);
  expect(layerS2L2A.upsampling).toBe(Interpolator.NEAREST);
});

test('Upsampling should not be overriden by layer default value', async () => {
  const layerS2L2A = new S2L2ALayer({
    instanceId: 'INSTANCE_ID',
    layerId: 'LAYER_ID',
    upsampling: Interpolator.NEAREST,
  });

  const { getMapParams, mockedLayersResponse } = constructFixture();

  const mockNetwork = new MockAdapter(axios);
  mockNetwork.reset();
  mockNetwork.onGet().reply(200, mockedLayersResponse);
  mockNetwork.onPost().reply(200);
  setAuthToken('Token');

  //initialy upsampling is set, mosaickingOrder is null
  expect(layerS2L2A.upsampling).toBe(Interpolator.NEAREST);
  expect(layerS2L2A.mosaickingOrder).toBeNull();

  await layerS2L2A.getMap(getMapParams, ApiType.PROCESSING, {
    cache: {
      expiresIn: 0,
    },
  });
  expect(mockNetwork.history.post.length).toBe(1);
  const { dataFilter, processing } = extractInputDataFromPayload(
    JSON.parse(mockNetwork.history.post[0].data),
  );
  //upsampling is not overriden by default values from service
  expect(processing.upsampling).toBe(Interpolator.NEAREST);
  expect(layerS2L2A.upsampling).toBe(Interpolator.NEAREST);

  //mosaickingOrder is set from default values from service
  expect(dataFilter.mosaickingOrder).toBe(MosaickingOrder.MOST_RECENT);
  expect(layerS2L2A.mosaickingOrder).toBe(MosaickingOrder.MOST_RECENT);
});
