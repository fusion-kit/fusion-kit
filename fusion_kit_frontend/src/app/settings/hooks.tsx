import {
  ApolloError, SubscriptionResult, useMutation, useQuery, useSubscription,
} from "@apollo/client";
import React, {
  useCallback, useEffect, useState,
} from "react";
import { ulid } from "ulid";

import {
  DownloadModelDocument, DownloadModelSubscription,
  GetSettingsDocument, GetSettingsQuery, UpdateSettingsDocument,
} from "../../generated/graphql";
import { unreachable } from "../../utils";

export type Settings = GetSettingsQuery["settings"];

type SettingsModel = Settings["models"][0];

export const DEFAULT_CONFIG_FILENAME = "v1-inference.yaml";

interface UseSettings {
  loading: boolean,
  isSaving: boolean,
  canSave: boolean,
  loadError: ApolloError | undefined,
  saveError: ApolloError | undefined,
  currentSettings: Settings,
  setCurrentSettings: React.Dispatch<React.SetStateAction<Settings>>,
  addModel: (_newModel: SettingsModel) => void,
  createModel: () => void,
  updateModel: (_id: string, _f: (_currentModel: SettingsModel) => SettingsModel) => void,
  removeModel: (_id: string) => void,
  setActiveModel: (_id: string) => void,
  saveSettings: () => Promise<boolean>,
}

const DEFAULT_SETTINGS: Settings = {
  isReady: true,
  availableDevices: [],
  device: "",
  models: [],
  modelsFilePath: "",
  showPreviews: true,
  stepsPerPreview: 10,
  useFullPrecision: false,
};

export function useSettings(): UseSettings {
  const settingsQueryResult = useQuery(GetSettingsDocument);
  const [currentSettings, setCurrentSettings] = useState(DEFAULT_SETTINGS);
  const [updateSettings, updateSettingsResult] = useMutation(UpdateSettingsDocument);

  useEffect(() => {
    const { loading, error, data } = settingsQueryResult;
    if (!loading && error == null && data != null) {
      setCurrentSettings(data.settings);
    }
  }, [settingsQueryResult]);

  const saveSettings = useCallback(async () => {
    const success = await updateSettings({
      variables: {
        newSettings: {
          device: currentSettings.device,
          models: currentSettings.models.map((model) => (
            {
              isActive: model.isActive,
              id: model.id,
              name: model.name,
              weightsFilename: model.weightsFilename,
              configFilename: model.configFilename,
              width: model.width,
              height: model.height,
            }
          )),
          showPreviews: currentSettings.showPreviews,
          stepsPerPreview: currentSettings.stepsPerPreview,
          useFullPrecision: currentSettings.useFullPrecision,
        },
      },
    }).then((res) => res.data != null).catch(() => false);

    return success;
  }, [currentSettings, updateSettings]);

  const addModel = useCallback((newModel: SettingsModel) => {
    setCurrentSettings((currentSettings) => {
      const hasActiveModel: boolean = currentSettings.models.some((model) => model.isActive);
      return {
        ...currentSettings,
        models: [
          ...currentSettings.models,
          {
            ...newModel,
            isActive: !hasActiveModel,
          },
        ],
      };
    });
  }, []);

  const createModel = useCallback(() => {
    addModel({
      id: ulid(),
      isActive: false,
      name: "",
      weightsFilename: "",
      configFilename: DEFAULT_CONFIG_FILENAME,
      width: 512,
      height: 512,
    });
  }, [addModel]);

  const removeModel = useCallback((id: string) => {
    setCurrentSettings((currentSettings) => {
      return {
        ...currentSettings,
        models: currentSettings.models.filter((model) => model.id !== id),
      };
    });
  }, []);

  const updateModel = useCallback((id: string, f: (_model: SettingsModel) => SettingsModel) => {
    setCurrentSettings((currentSettings) => {
      return {
        ...currentSettings,
        models: currentSettings.models.map((model) => {
          if (model.id === id) {
            return f(model);
          } else {
            return model;
          }
        }),
      };
    });
  }, []);

  const setActiveModel = useCallback((id: string) => {
    setCurrentSettings((currentSettings) => {
      return {
        ...currentSettings,
        models: currentSettings.models.map((model) => ({
          ...model,
          isActive: id === model.id,
        })),
      };
    });
  }, []);

  const canSave = !settingsQueryResult.loading && !updateSettingsResult.loading;

  return {
    loading: settingsQueryResult.loading,
    loadError: settingsQueryResult.error,
    isSaving: updateSettingsResult.loading,
    canSave,
    saveError: updateSettingsResult.error,
    currentSettings,
    setCurrentSettings,
    addModel,
    createModel,
    updateModel,
    removeModel,
    setActiveModel,
    saveSettings,
  };
}

interface DownloadModelOptions {
  modelId: string,
  onDownloadComplete: (_model: SettingsModel) => void,
}

export type DownloadState =
  | { state: "waiting" }
  | { state: "downloading", downloadedBytes: number, totalBytes?: number }
  | { state: "complete" }
  | { state: "error", message: string };

interface UseDownloadModel {
  downloadModel: (_opts: DownloadModelOptions) => void,
  downloadState: DownloadState,
  canDownload: boolean,
}

interface CurrentDownload {
  watermark: number,
  downloadOptions?: DownloadModelOptions,
}

export function useDownloadModel(): UseDownloadModel {
  const [currentDownload, setCurrentDownload] = useState<CurrentDownload>({
    watermark: 0,
  });
  const downloadResult = useSubscription(DownloadModelDocument, {
    variables: {
      modelId: currentDownload.downloadOptions?.modelId!,
      _watermark: currentDownload.watermark, // Force re-subscription
    },
    skip: currentDownload.downloadOptions == null,
  });

  const downloadModel = useCallback((opts: DownloadModelOptions) => {
    setCurrentDownload(({ watermark }) => ({
      watermark: watermark + 1,
      downloadOptions: opts,
    }));
  }, []);

  const onDownloadComplete = currentDownload.downloadOptions?.onDownloadComplete;
  const downloadModelState = downloadResult.data?.downloadModel;
  useEffect(() => {
    if (downloadModelState?.__typename === "ModelDownloadComplete") {
      onDownloadComplete?.({
        isActive: false,
        id: downloadModelState.id,
        name: downloadModelState.name,
        weightsFilename: downloadModelState.weightsFilename,
        configFilename: downloadModelState.configFilename,
        width: downloadModelState.width,
        height: downloadModelState.height,
      });
    }
  }, [onDownloadComplete, downloadModelState]);

  const downloadState = getDownloadState(downloadResult);

  const canDownload = canStartDownload(downloadState);

  return {
    downloadModel,
    downloadState,
    canDownload,
  };
}

function getDownloadState(
  downloadResult: SubscriptionResult<DownloadModelSubscription>,
): DownloadState {
  const { data, loading, error } = downloadResult;

  if (error != null) {
    return {
      state: "error",
      message: error.message,
    };
  }

  if (data == null) {
    if (!loading) {
      return {
        state: "waiting",
      };
    } else {
      return {
        state: "downloading",
        downloadedBytes: 0,
      };
    }
  }

  switch (data.downloadModel.__typename) {
    case "ModelDownloadComplete":
      return {
        state: "complete",
      };
    case "ModelDownloadProgress":
      return {
        state: "downloading",
        downloadedBytes: data.downloadModel.downloadedBytes,
        totalBytes: data.downloadModel.totalBytes ?? undefined,
      };
    case "ModelDownloadError":
      return {
        state: "error",
        message: data.downloadModel.message,
      };
    default:
      return unreachable(data.downloadModel);
  }
}

function canStartDownload(state: DownloadState): boolean {
  switch (state.state) {
    case "waiting":
      return true;
    case "downloading":
      return false;
    case "error":
      return true;
    case "complete":
      return false;
    default:
      return unreachable(state);
  }
}
