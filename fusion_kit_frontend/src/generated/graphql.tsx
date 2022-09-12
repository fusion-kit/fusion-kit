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
};

export type DreamComplete = {
  __typename?: 'DreamComplete';
  images: Array<DreamImage>;
};

export type DreamError = {
  __typename?: 'DreamError';
  errorMessage: Scalars['String'];
};

export type DreamImage = {
  __typename?: 'DreamImage';
  imageUri: Scalars['String'];
};

export type DreamPending = {
  __typename?: 'DreamPending';
  complete?: Maybe<Scalars['Boolean']>;
};

export type DreamRunning = {
  __typename?: 'DreamRunning';
  previewImages: Array<DreamImage>;
};

export type DreamState = DreamComplete | DreamError | DreamPending | DreamRunning;

export type Mutation = {
  __typename?: 'Mutation';
  startDream: Scalars['ID'];
};


export type MutationStartDreamArgs = {
  prompt: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  hello: Scalars['String'];
};

export type Subscription = {
  __typename?: 'Subscription';
  watchDream: DreamState;
};


export type SubscriptionWatchDreamArgs = {
  dreamId: Scalars['ID'];
};

export type StartDreamMutationVariables = Exact<{
  prompt: Scalars['String'];
}>;


export type StartDreamMutation = { __typename?: 'Mutation', startDream: string };

export type WatchDreamSubscriptionVariables = Exact<{
  dreamId: Scalars['ID'];
}>;


export type WatchDreamSubscription = { __typename?: 'Subscription', watchDream: { __typename: 'DreamComplete', images: Array<{ __typename?: 'DreamImage', imageUri: string }> } | { __typename: 'DreamError' } | { __typename: 'DreamPending' } | { __typename: 'DreamRunning', previewImages: Array<{ __typename?: 'DreamImage', imageUri: string }> } };


export const StartDreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartDream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"prompt"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startDream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"prompt"},"value":{"kind":"Variable","name":{"kind":"Name","value":"prompt"}}}]}]}}]} as unknown as DocumentNode<StartDreamMutation, StartDreamMutationVariables>;
export const WatchDreamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"WatchDream"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dreamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"watchDream"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"dreamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dreamId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DreamRunning"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"previewImages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imageUri"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DreamComplete"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"images"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"imageUri"}}]}}]}}]}}]}}]} as unknown as DocumentNode<WatchDreamSubscription, WatchDreamSubscriptionVariables>;