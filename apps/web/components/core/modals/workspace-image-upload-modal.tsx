/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
// strata imports
import { ACCEPTED_AVATAR_IMAGE_MIME_TYPES_FOR_REACT_DROPZONE, MAX_FILE_SIZE } from "@strata/constants";
import { Button } from "@makestrata/propel/components/button";
import { InputField } from "@makestrata/propel/components/input-field";
import { Tab, Tabs, TabsList, TabsPanel } from "@makestrata/propel/components/tabs";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogHeading,
  DialogInfo,
  DialogMain,
  DialogTitle,
} from "@makestrata/propel/components/dialog";
import { UserOutline } from "@makestrata/propel/icons";
import { setToast } from "@strata/blocks/toast";
import { useTranslation } from "@strata/i18n";
import { EFileAssetType } from "@strata/types";
import { getAssetIdFromUrl, getFileURL, checkURLValidity } from "@strata/utils";
// helpers
import {
  convertAvatarDataUriToPng,
  createDiceBearAvatarDataUri,
  DICEBEAR_AVATAR_STYLES,
  type TDiceBearAvatarStyle,
} from "@/helpers/dicebear-avatar.helper";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
// services
import { FileService } from "@/services/file.service";

type Props = {
  handleRemove: () => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (url: string) => void;
  value: string | null;
};

// services
const fileService = new FileService();

export const WorkspaceImageUploadModal = observer(function WorkspaceImageUploadModal(props: Props) {
  const { handleRemove, isOpen, onClose, onSuccess, value } = props;
  // states
  const [image, setImage] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const [avatarStyle, setAvatarStyle] = useState<TDiceBearAvatarStyle>("lorelei");
  const [avatarSeed, setAvatarSeed] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const { currentWorkspace, updateWorkspaceLogo } = useWorkspace();
  const { t } = useTranslation();
  const effectiveAvatarSeed = avatarSeed || currentWorkspace?.name || "workspace";
  const generatedAvatar = useMemo(
    () => createDiceBearAvatarDataUri(avatarStyle, effectiveAvatarSeed),
    [avatarStyle, effectiveAvatarSeed]
  );

  const onDrop = (acceptedFiles: File[]) => setImage(acceptedFiles[0]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_AVATAR_IMAGE_MIME_TYPES_FOR_REACT_DROPZONE,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleClose = () => {
    setIsImageUploading(false);
    onClose();
    setTimeout(() => {
      setImage(null);
    }, 300);
  };

  const handleSubmit = async () => {
    if (!workspaceSlug || !currentWorkspace || (activeTab === "upload" && !image)) return;
    setIsImageUploading(true);

    try {
      const imageToUpload =
        activeTab === "generate"
          ? await convertAvatarDataUriToPng(generatedAvatar, currentWorkspace.slug)
          : (image as File);
      const { asset_url } = await fileService.uploadWorkspaceAsset(
        workspaceSlug.toString(),
        {
          entity_identifier: currentWorkspace.id,
          entity_type: EFileAssetType.WORKSPACE_LOGO,
        },
        imageToUpload
      );
      updateWorkspaceLogo(workspaceSlug.toString(), asset_url);
      onSuccess(asset_url);
    } catch (error: unknown) {
      console.error("Error updating workspace image:", error);
      const message =
        typeof error === "object" && error !== null && "error" in error && typeof error.error === "string"
          ? error.error
          : t("workspace_settings.settings.general.logo_dialog.error_message");
      setToast({
        type: "error",
        title: t("workspace_settings.settings.general.logo_dialog.error_title"),
        message,
      });
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleImageRemove = async () => {
    if (!workspaceSlug || !value) return;
    setIsRemoving(true);
    try {
      if (checkURLValidity(value)) {
        await fileService.deleteOldWorkspaceAsset(currentWorkspace?.id ?? "", value);
      } else {
        const assetId = getAssetIdFromUrl(value);
        await fileService.deleteWorkspaceAsset(workspaceSlug.toString(), assetId);
      }
      await handleRemove();
      handleClose();
    } catch (error) {
      console.log("Error in removing workspace asset:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent size="sm">
        <DialogMain>
          <DialogHeader>
            <DialogHeading>
              <DialogTitle>{t("workspace_settings.settings.general.logo_dialog.title")}</DialogTitle>
            </DialogHeading>
          </DialogHeader>
          <DialogBody tabIndex={0}>
            <Tabs
              variant="contained"
              stretch="full"
              layout="fill"
              value={activeTab}
              onValueChange={(nextTab) => nextTab && setActiveTab(nextTab)}
            >
              <TabsList aria-label={t("workspace_settings.settings.general.logo_dialog.source_label")}>
                <Tab value="generate" label={t("workspace_settings.settings.general.logo_dialog.generate_tab")} />
                <Tab value="upload" label={t("workspace_settings.settings.general.logo_dialog.upload_tab")} />
              </TabsList>
              <TabsPanel value="generate">
                <div className="mt-5 space-y-5">
                  <div className="flex justify-center">
                    <img
                      src={generatedAvatar}
                      alt={t("workspace_settings.settings.general.logo_dialog.generated_preview_alt")}
                      className="size-40 rounded-xl"
                    />
                  </div>
                  <InputField
                    id="workspace-avatar-seed"
                    name="workspace-avatar-seed"
                    type="text"
                    size="lg"
                    orientation="vertical"
                    label={t("workspace_settings.settings.general.logo_dialog.seed_label")}
                    value={avatarSeed}
                    placeholder={currentWorkspace?.name ?? t("workspace_settings.settings.general.name")}
                    onChange={(event) => setAvatarSeed(event.target.value)}
                    description={t("workspace_settings.settings.general.logo_dialog.seed_description")}
                  />
                  <div>
                    <p className="mb-2 text-body-sm-medium">
                      {t("workspace_settings.settings.general.logo_dialog.style_label")}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {DICEBEAR_AVATAR_STYLES.map(({ key, label }) => {
                        const preview = createDiceBearAvatarDataUri(key, effectiveAvatarSeed);
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`flex flex-col items-center gap-2 rounded-lg border p-2 outline-none focus-visible:ring-2 focus-visible:ring-accent-strong ${
                              avatarStyle === key ? "border-accent-strong bg-surface-2" : "border-subtle"
                            }`}
                            onClick={() => setAvatarStyle(key)}
                            aria-pressed={avatarStyle === key}
                          >
                            <img src={preview} alt="" className="size-16 rounded-md" />
                            <span className="text-body-xs-medium">
                              {t(`workspace_settings.settings.general.logo_dialog.styles.${key}`, {
                                defaultValue: label,
                              })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsPanel>
              <TabsPanel value="upload">
                <div className="mt-5 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <div
                        {...getRootProps()}
                        className={`relative grid h-80 w-80 cursor-pointer place-items-center rounded-lg p-12 text-center focus:ring-2 focus:ring-accent-strong focus:ring-offset-2 focus:outline-none ${
                          (image === null && isDragActive) || !value
                            ? "border-2 border-dashed border-subtle hover:bg-surface-2"
                            : ""
                        }`}
                      >
                        {image !== null || (value && value !== "") ? (
                          <>
                            <div className="absolute top-2 right-2 z-40">
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                stretch="auto"
                                label={t("workspace_settings.settings.general.logo_dialog.edit")}
                              />
                            </div>
                            <img
                              src={image ? URL.createObjectURL(image) : value ? getFileURL(value) : ""}
                              alt={t("workspace_settings.settings.general.logo_dialog.logo_preview_alt")}
                              className="absolute top-0 left-0 h-full w-full rounded-md object-cover"
                            />
                          </>
                        ) : (
                          <div>
                            <UserOutline className="mx-auto h-16 w-16 text-secondary" />
                            <span className="mt-2 block text-body-xs-medium text-secondary">
                              {isDragActive
                                ? t("workspace_settings.settings.general.logo_dialog.drop_active")
                                : t("workspace_settings.settings.general.logo_dialog.drop_idle")}
                            </span>
                          </div>
                        )}

                        <input {...getInputProps()} />
                      </div>
                    </div>
                    {fileRejections.length > 0 && (
                      <p className="text-body-xs-regular text-danger-primary">
                        {fileRejections[0].errors[0].code === "file-too-large"
                          ? t("workspace_settings.settings.general.logo_dialog.file_too_large")
                          : t("workspace_settings.settings.general.logo_dialog.invalid_file")}
                      </p>
                    )}
                  </div>
                  <p className="text-body-xs-regular text-secondary">
                    {t("workspace_settings.settings.general.logo_dialog.supported_formats")}
                  </p>
                </div>
              </TabsPanel>
            </Tabs>
          </DialogBody>
        </DialogMain>
        <DialogActions>
          <DialogInfo>
            <Button
              variant="danger"
              size="md"
              stretch="auto"
              label={
                isRemoving
                  ? t("workspace_settings.settings.general.logo_dialog.removing")
                  : t("workspace_settings.settings.general.logo_dialog.remove")
              }
              onClick={handleImageRemove}
              disabled={!value}
              loading={isRemoving}
            />
          </DialogInfo>
          <Button
            variant="secondary"
            size="md"
            stretch="auto"
            label={t("workspace_settings.settings.general.logo_dialog.cancel")}
            onClick={handleClose}
          />
          <Button
            variant="primary"
            size="md"
            stretch="auto"
            label={
              isImageUploading
                ? t("workspace_settings.settings.general.logo_dialog.saving")
                : activeTab === "generate"
                  ? t("workspace_settings.settings.general.logo_dialog.generate_and_save")
                  : t("workspace_settings.settings.general.logo_dialog.upload_and_save")
            }
            onClick={handleSubmit}
            disabled={activeTab === "upload" && !image}
            loading={isImageUploading}
          />
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
});
