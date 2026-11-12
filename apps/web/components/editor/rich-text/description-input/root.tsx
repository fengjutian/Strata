/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { debounce } from "lodash-es";
import { observer } from "mobx-react";
import { useForm } from "react-hook-form";
// strata imports
import type { EditorRefApi, TExtensions } from "@strata/editor";
import { useTranslation } from "@strata/i18n";
import type { EFileAssetType, TNameDescriptionLoader } from "@strata/types";
import { getDescriptionPlaceholderI18n } from "@strata/utils";
// components
import { RichTextEditor } from "@/components/editor/rich-text";
// hooks
import { useEditorAsset } from "@/hooks/store/use-editor-asset";
import { useWorkspace } from "@/hooks/store/use-workspace";
// strata web services
import { WorkspaceService } from "@/services/workspace.service";
// local imports
import { DescriptionInputLoader } from "./loader";
// services init
const workspaceService = new WorkspaceService();

type TFormData = {
  id: string;
  description_html: string;
  description_json?: object;
  isMigrationUpdate: boolean;
};

type Props = {
  /**
   * @description Container class name, this will be used to add custom styles to the editor container
   */
  containerClassName?: string;
  /**
   * @description Disabled, this will be used to disable the editor
   */
  disabled?: boolean;
  /**
   * @description Disabled extensions, this will be used to disable the extensions in the editor
   */
  disabledExtensions?: TExtensions[];
  /**
   * @description Editor ref, this will be used to imperatively attach editor related helper functions
   */
  editorRef?: React.RefObject<EditorRefApi | null>;
  /**
   * @description Entity ID, this will be used for file uploads and as the unique identifier for the entity
   */
  entityId: string;
  /**
   * @description File asset type, this will be used to upload the file to the editor
   */
  fileAssetType: EFileAssetType;
  /**
   * @description Initial value, pass the actual description to initialize the editor
   */
  initialValue: string | undefined;
  /**
   * @description Key, to ensure the editor is re-rendered when the key changes
   */
  key: string;
  /**
   * @description Submit handler, the actual function which will be called when the form is submitted
   */
  onSubmit: (
    value: {
      description_html: string;
      description_json: object | undefined;
    },
    isMigrationUpdate?: boolean
  ) => Promise<void>;
  /**
   * @description Placeholder, if not provided, the placeholder will be the default placeholder
   */
  placeholder?: string | ((isFocused: boolean, value: string) => string);
  /**
   * @description projectId, if not provided, the entity will be considered as a workspace entity
   */
  projectId?: string;
  /**
   * @description Set is submitting, use it to set the loading state of the form
   */
  setIsSubmitting: (initialValue: TNameDescriptionLoader) => void;
  /**
   * @description SWR description, use it only if you want to sync changes in realtime(pseudo realtime)
   */
  swrDescription?: string | null | undefined;
  /**
   * @description Workspace slug, this will be used to get the workspace details
   */
  workspaceSlug: string;
  /**
   * @description Issue sequence id, this will be used to get the issue sequence id
   */
  issueSequenceId?: number;
};

/**
 * @description DescriptionInput component for rich text editor with autosave functionality using debounce
 * The component also makes an API call to save the description on unmount
 */
export const DescriptionInput = observer(function DescriptionInput(props: Props) {
  const {
    containerClassName,
    disabled,
    disabledExtensions,
    editorRef,
    entityId,
    fileAssetType,
    initialValue,
    issueSequenceId,
    onSubmit,
    placeholder,
    projectId,
    setIsSubmitting,
    swrDescription,
    workspaceSlug,
  } = props;
  // states
  const [localDescription, setLocalDescription] = useState<TFormData>({
    id: entityId,
    description_html: initialValue?.trim() ?? "",
    isMigrationUpdate: false,
  });
  // ref to track if there are unsaved changes
  const hasUnsavedChanges = useRef(false);
  // ref to track last saved content (to skip onChange when content hasn't actually changed)
  const lastSavedContent = useRef(initialValue?.trim() === "" ? "<p></p>" : (initialValue ?? "<p></p>"));
  // The editor hands the content over as getters. Serializing the document walks the whole document,
  // and the description is only needed when it is saved - which is debounced. The getters are resolved
  // at the latest possible moment, while the editor is still alive.
  const contentGetters = useRef<{ html: () => string; json: () => object } | null>(null);
  const resolvedContent = useRef<{ html: string; json: object } | null>(null);

  const resolveContent = useCallback(() => {
    const getters = contentGetters.current;
    if (!getters) return null;

    const html = getters.html();
    // An empty document means the editor is gone, there is nothing left to save.
    if (!html) return null;

    return { html, json: getters.json() };
  }, []);
  // store hooks
  const { getWorkspaceBySlug } = useWorkspace();
  const { uploadEditorAsset, duplicateEditorAsset } = useEditorAsset();
  // derived values
  const workspaceDetails = getWorkspaceBySlug(workspaceSlug);
  // translation
  const { t } = useTranslation();
  // form info
  const { handleSubmit, reset, setValue } = useForm<TFormData>({
    defaultValues: {
      id: entityId,
      description_html: initialValue?.trim() ?? "",
      isMigrationUpdate: false,
    },
  });

  // submit handler
  const handleDescriptionFormSubmit = useCallback(
    async (formData: TFormData) => {
      const content = resolvedContent.current ?? resolveContent();

      if (!content) return;

      // The content did not change since the last save, so there is nothing to send.
      if (content.html === lastSavedContent.current) return;

      await onSubmit(
        {
          description_html: content.html,
          description_json: content.json,
        },
        formData.isMigrationUpdate
      );
      // Update lastSavedContent after successful save
      lastSavedContent.current = content.html;
    },
    [onSubmit, resolveContent]
  );

  // reset form values
  useEffect(() => {
    if (!entityId) return;
    const normalizedValue = initialValue?.trim() === "" ? "<p></p>" : (initialValue ?? "<p></p>");
    // Update last saved content when entity/initialValue changes
    lastSavedContent.current = normalizedValue;
    reset({
      id: entityId,
      description_html: normalizedValue,
      isMigrationUpdate: false,
    });
    setLocalDescription({
      id: entityId,
      description_html: normalizedValue,
      isMigrationUpdate: false,
    });
    // Reset unsaved changes flag when form is reset
    hasUnsavedChanges.current = false;
  }, [entityId, initialValue, reset]);

  // ADDING handleDescriptionFormSubmit TO DEPENDENCY ARRAY PRODUCES ADVERSE EFFECTS
  // TODO: Verify the exhaustive-deps warning
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFormSave = useCallback(
    debounce(async () => {
      // Resolve the content now: the editor is still alive at this point.
      resolvedContent.current = resolveContent();
      handleSubmit(handleDescriptionFormSubmit)()
        .catch((error) => console.error(`Failed to save description for ${entityId}:`, error))
        .finally(() => {
          setIsSubmitting("submitted");
          hasUnsavedChanges.current = false;
        });
    }, 1500),
    [entityId, handleSubmit, resolveContent]
  );

  // Save on unmount if there are unsaved changes
  useEffect(
    () => () => {
      debouncedFormSave.cancel();

      if (hasUnsavedChanges.current) {
        // Resolve the content while the editor is still alive: this cleanup runs before the editor is
        // destroyed, but the submit handler below runs after it.
        resolvedContent.current = resolveContent();
        handleSubmit(handleDescriptionFormSubmit)()
          .catch((error) => {
            console.error("Failed to save description on unmount:", error);
          })
          .finally(() => {
            setIsSubmitting("submitted");
            hasUnsavedChanges.current = false;
          });
      }
    },
    // since we don't want to save on unmount if there are no unsaved changes, no deps are needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!workspaceDetails) return null;

  if (!localDescription.description_html) return <DescriptionInputLoader />;

  return (
    <RichTextEditor
      key={entityId}
      editable={!disabled}
      ref={editorRef}
      id={entityId}
      issueSequenceId={issueSequenceId}
      disabledExtensions={disabledExtensions}
      initialValue={localDescription.description_html ?? "<p></p>"}
      value={swrDescription ?? null}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceDetails.id}
      projectId={projectId}
      dragDropEnabled
      onChange={(description_json, description_html, options) => {
        // Keep the getters instead of the content: serializing the document walks the whole document,
        // and the description is only needed when it is saved.
        contentGetters.current = { html: description_html, json: description_json };
        setIsSubmitting("submitting");
        setValue("isMigrationUpdate", !!options?.isMigrationUpdate);
        hasUnsavedChanges.current = true;
        debouncedFormSave();
      }}
      placeholder={placeholder ?? ((isFocused, value) => t(getDescriptionPlaceholderI18n(isFocused, value)))}
      searchMentionCallback={async (payload) =>
        await workspaceService.searchEntity(workspaceSlug?.toString() ?? "", {
          ...payload,
          project_id: projectId,
        })
      }
      containerClassName={containerClassName}
      uploadFile={async (blockId, file) => {
        try {
          const { asset_id } = await uploadEditorAsset({
            blockId,
            data: {
              entity_identifier: entityId,
              entity_type: fileAssetType,
            },
            file,
            projectId,
            workspaceSlug,
          });
          return asset_id;
        } catch (error) {
          console.log("Error in uploading asset:", error);
          throw new Error("Asset upload failed. Please try again later.", { cause: error });
        }
      }}
      duplicateFile={async (assetId: string) => {
        try {
          const { asset_id } = await duplicateEditorAsset({
            assetId,
            entityType: fileAssetType,
            projectId,
            workspaceSlug,
          });
          return asset_id;
        } catch {
          throw new Error("Asset duplication failed. Please try again later.");
        }
      }}
    />
  );
});
