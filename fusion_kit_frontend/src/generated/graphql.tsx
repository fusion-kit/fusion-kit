import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Bytes: any;
  Upload: any;
};

export type Dream = {
  id: Scalars['ID'];
  images: Array<DreamImage>;
};

export enum DreamBaseImageMaskType {
  KeepMasked = 'KEEP_MASKED',
  ReplaceMasked = 'REPLACE_MASKED'
}

export type DreamImage = {
  dreamId: Scalars['ID'];
  id: Scalars['ID'];
};

export type DreamOptionsInput = {
  baseImage?: InputMaybe<Scalars['Upload']>;
  baseImageDecimation?: InputMaybe<Scalars['Float']>;
  baseImageMask?: InputMaybe<Scalars['Upload']>;
  baseImageMaskType?: InputMaybe<DreamBaseImageMaskType>;
  guidanceScale: Scalars['Float'];
  height?: InputMaybe<Scalars['Int']>;
  numImages: Scalars['Int'];
  prompt: Scalars['String'];
  sampler: DreamSampler;
  samplerEta: Scalars['Float'];
  samplerSteps: Scalars['Int'];
  seed?: InputMaybe<Scalars['Int']>;
  width?: InputMaybe<Scalars['Int']>;
};

export enum DreamSampler {
  Ddim = 'DDIM',
  Plms = 'PLMS'
}

export type FinishedDream = Dream & {
  __typename?: 'FinishedDream';
  id: Scalars['ID'];
  images: Array<FinishedDreamImage>;
  seed: Scalars['Int'];
};

export type FinishedDreamImage = DreamImage & {
  __typename?: 'FinishedDreamImage';
  dreamId: Scalars['ID'];
  id: Scalars['ID'];
  imagePath: Scalars['String'];
  seed: Scalars['Int'];
};

export type ModelDownload = ModelDownloadComplete | ModelDownloadError | ModelDownloadProgress;

export type ModelDownloadComplete = {
  __typename?: 'ModelDownloadComplete';
  configFilename: Scalars['String'];
  height: Scalars['Int'];
  id: Scalars['ID'];
  name: Scalars['String'];
  weightsFilename: Scalars['String'];
  width: Scalars['Int'];
};

export type ModelDownloadError = {
  __typename?: 'ModelDownloadError';
  message: Scalars['String'];
};

export type ModelDownloadProgress = {
  __typename?: 'ModelDownloadProgress';
  downloadedBytes: Scalars['Bytes'];
  totalBytes?: Maybe<Scalars['Bytes']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  startDream: Dream;
  updateSettings: Settings;
};


export type MutationStartDreamArgs = {
  options: DreamOptionsInput;
};


export type MutationUpdateSettingsArgs = {
  newSettings: SettingsInput;
};

export type PendingDream = Dream & {
  __typename?: 'PendingDream';
  id: Scalars['ID'];
  images: Array<PendingDreamImage>;
};

export type PendingDreamImage = DreamImage & {
  __typename?: 'PendingDreamImage';
  dreamId: Scalars['ID'];
  id: Scalars['ID'];
};

export type Query = {
  __typename?: 'Query';
  settings: Settings;
};

export type RunningDream = Dream & {
  __typename?: 'RunningDream';
  id: Scalars['ID'];
  images: Array<DreamImage>;
  numFinishedImages: Scalars['Int'];
  numFinishedSteps: Scalars['Int'];
  numTotalImages: Scalars['Int'];
  numTotalSteps: Scalars['Int'];
};

export type RunningDreamImage = DreamImage & {
  __typename?: 'RunningDreamImage';
  dreamId: Scalars['ID'];
  id: Scalars['ID'];
  numFinishedSteps: Scalars['Int'];
  numTotalSteps: Scalars['Int'];
  previewImagePath?: Maybe<Scalars['String']>;
};

export type Settings = {
  __typename?: 'Settings';
  activeModel?: Maybe<SettingsModel>;
  availableDevices: Array<Scalars['String']>;
  device: Scalars['String'];
  isReady: Scalars['Boolean'];
  models: Array<SettingsModel>;
  modelsFilePath: Scalars['String'];
  showPreviews: Scalars['Boolean'];
  stepsPerPreview: Scalars['Int'];
  useFullPrecision: Scalars['Boolean'];
};

export type SettingsInput = {
  device: Scalars['String'];
  models: Array<SettingsModelInput>;
  showPreviews: Scalars['Boolean'];
  stepsPerPreview: Scalars['Int'];
  useFullPrecision: Scalars['Boolean'];
};

export type SettingsModel = {
  __typename?: 'SettingsModel';
  configFilename: Scalars['String'];
  height: Scalars['Int'];
  id: Scalars['ID'];
  isActive: Scalars['Boolean'];
  name: Scalars['String'];
  weightsFilename: Scalars['String'];
  width: Scalars['Int'];
};

export type SettingsModelInput = {
  configFilename: Scalars['String'];
  height: Scalars['Int'];
  id: Scalars['ID'];
  isActive: Scalars['Boolean'];
  name: Scalars['String'];
  weightsFilename: Scalars['String'];
  width: Scalars['Int'];
};

export type StoppedDream = Dream & {
  __typename?: 'StoppedDream';
  id: Scalars['ID'];
  images: Array<DreamImage>;
  message?: Maybe<Scalars['String']>;
  reason: StoppedDreamReason;
};

export type StoppedDreamImage = DreamImage & {
  __typename?: 'StoppedDreamImage';
  dreamId: Scalars['ID'];
  id: Scalars['ID'];
};

export enum StoppedDreamReason {
  DreamError = 'DREAM_ERROR'
}

export type Subscription = {
  __typename?: 'Subscription';
  downloadModel: ModelDownload;
  watchDream: Dream;
};


export type SubscriptionDownloadModelArgs = {
  modelId: Scalars['ID'];
};


export type SubscriptionWatchDreamArgs = {
  dreamId: Scalars['ID'];
};

export type DownloadModelSubscriptionVariables = Exact<{
  modelId: Scalars['ID'];
}>;


export type DownloadModelSubscription = { __typename?: 'Subscription', downloadModel: { __typename: 'ModelDownloadComplete', id: string, name: string, weightsFilename: string, configFilename: string, width: number, height: number } | { __typename: 'ModelDownloadError', message: string } | { __typename: 'ModelDownloadProgress', downloadedBytes: any, totalBytes?: any | null } };

export type GetSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSettingsQuery = { __typename?: 'Query', settings: { __typename?: 'Settings', availableDevices: Array<string>, modelsFilePath: string, device: string, showPreviews: boolean, stepsPerPreview: number, useFullPrecision: boolean, models: Array<{ __typename?: 'SettingsModel', isActive: boolean, id: string, name: string, weightsFilename: string, configFilename: string, width: number, height: number }> } };

export type StartDreamMutationVariables = Exact<{
  options: DreamOptionsInput;
}>;


export type StartDreamMutation = { __typename?: 'Mutation', startDream: { __typename?: 'FinishedDream', id: string } | { __typename?: 'PendingDream', id: string } | { __typename?: 'RunningDream', id: string } | { __typename?: 'StoppedDream', id: string } };

export type UpdateSettingsMutationVariables = Exact<{
  newSettings: SettingsInput;
}>;


export type UpdateSettingsMutation = { __typename?: 'Mutation', updateSettings: { __typename: 'Settings' } };

export type WatchDreamSubscriptionVariables = Exact<{
  dreamId: Scalars['ID'];
}>;


export type WatchDreamSubscription = { __typename?: 'Subscription', watchDream: { __typename: 'FinishedDream', id: string, images: Array<{ __typename: 'FinishedDreamImage', imagePath: string, id: string }> } | { __typename: 'PendingDream', id: string, images: Array<{ __typename: 'PendingDreamImage', id: string }> } | { __typename: 'RunningDream', numFinishedImages: number, numTotalImages: number, numFinishedSteps: number, numTotalSteps: number, id: string, images: Array<{ __typename: 'FinishedDreamImage', imagePath: string, id: string } | { __typename: 'PendingDreamImage', id: string } | { __typename: 'RunningDreamImage', numFinishedSteps: number, numTotalSteps: number, previewImagePath?: string | null, id: string } | { __typename: 'StoppedDreamImage', id: string }> } | { __typename: 'StoppedDream', reason: StoppedDreamReason, message?: string | null, id: string, images: Array<{ __typename: 'FinishedDreamImage', imagePath: string, id: string } | { __typename: 'PendingDreamImage', id: string } | { __typename: 'RunningDreamImage', numFinishedSteps: number, numTotalSteps: number, previewImagePath?: string | null, id: string } | { __typename: 'StoppedDreamImage', id: string }> } };


export const DownloadModelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"DownloadModel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"modelId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"downloadModel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"modelId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"modelId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ModelDownloadComplete"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"weightsFilename"}},{"kind":"Field","name":{"kind":"Name","value":"configFilename"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ModelDownloadProgress"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"downloadedBytes"}},{"kind":"Field","name":{"kind":"Name","value":"totalBytes"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ModelDownloadError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<DownloadModelSubscription, DownloadModelSubscriptionVariables>;
export const GetSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableDevices"}},{"kind":"Field","name":{"kind":"Name","value":"modelsFilePath"}},{"kind":"Field","name":{"kind":"Name","value":"device"}},{"kind":"Field","name":{"kind":"Name","value":"showPreviews"}},{"kind":"Field","name":{"kind":"Name","value":"stepsPerPreview"}},{"kind":"Field","name":{"kind":"Name","value":"useFullPrecision"}},{"kind":"Field","name":{"kind":"Name","value":"models"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isActive"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"weightsFilename"}},{"kind":"Field","name":{"kind":"Name","value":"configFilename"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]} as unknown as DocumentNode<GetSettingsQuery, GetSettingsQueryVariables>;
export const StartDreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartDream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DreamOptionsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startDream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<StartDreamMutation, StartDreamMutationVariables>;
export const UpdateSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newSettings"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"newSettings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newSettings"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}}]}}]} as unknown as DocumentNode<UpdateSettingsMutation, UpdateSettingsMutationVariables>;
export const WatchDreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"WatchDream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"watchDream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"dreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"images"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RunningDreamImage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"numFinishedSteps"}},{"kind":"Field","name":{"kind":"Name","value":"numTotalSteps"}},{"kind":"Field","name":{"kind":"Name","value":"previewImagePath"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FinishedDreamImage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imagePath"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RunningDream"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"numFinishedImages"}},{"kind":"Field","name":{"kind":"Name","value":"numTotalImages"}},{"kind":"Field","name":{"kind":"Name","value":"numFinishedSteps"}},{"kind":"Field","name":{"kind":"Name","value":"numTotalSteps"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"StoppedDream"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<WatchDreamSubscription, WatchDreamSubscriptionVariables>;