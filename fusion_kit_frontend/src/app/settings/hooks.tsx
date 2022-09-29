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
  addModel: () => void,
  updateModel: (_id: string, _f: (_currentModel: SettingsModel) => SettingsModel) => void,
  removeModel: (_id: string) => void,
  setActiveModel: (_id: string) => void,
  saveSettings: () => void,
}

const DEFAULT_SETTINGS: Settings = {
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

  const saveSettings = useCallback(() => {
    updateSettings({
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
    });
  }, [currentSettings, updateSettings]);

  const addModel = useCallback(() => {
    setCurrentSettings((currentSettings) => {
      const hasActiveModel: boolean = currentSettings.models.some((model) => model.isActive);
      return {
        ...currentSettings,
        models: [...currentSettings.models, createNewModel(!hasActiveModel)],
      };
    });
  }, []);

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
    updateModel,
    removeModel,
    setActiveModel,
    saveSettings,
  };
}

function createNewModel(isActive: boolean): SettingsModel {
  return {
    id: ulid(),
    isActive,
    name: "",
    weightsFilename: "",
    configFilename: DEFAULT_CONFIG_FILENAME,
    width: 512,
    height: 512,
  };
}

interface DownloadModelOptions {
  modelId: string,
  onDownloadComplete: () => void,
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
    onSubscriptionComplete: currentDownload.downloadOptions?.onDownloadComplete,
  });

  const downloadModel = useCallback((opts: DownloadModelOptions) => {
    setCurrentDownload(({ watermark }) => ({
      watermark: watermark + 1,
      downloadOptions: opts,
    }));
  }, []);

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
