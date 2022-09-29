import { ApolloError, useMutation, useQuery } from "@apollo/client";
import React, {
  useCallback, useEffect, useState,
} from "react";
import { ulid } from "ulid";

import { GetSettingsDocument, GetSettingsQuery, UpdateSettingsDocument } from "../../generated/graphql";

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
          models: currentSettings.models,
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
