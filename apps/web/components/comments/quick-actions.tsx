/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { observer } from "mobx-react";
import {
  DeleteOutline,
  EditOutline,
  GlobeOutline,
  LinkOutline,
  LockOutline,
  MoreHorizontalOutline,
} from "@makestrata/propel/icons";
// strata imports
import { EIssueCommentAccessSpecifier } from "@strata/constants";
import { useTranslation } from "@strata/i18n";
import { Icon } from "@makestrata/propel/components/icon";
import { IconButton } from "@makestrata/propel/components/icon-button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@makestrata/propel/components/menu";
import type { TIssueComment, TCommentsOperations } from "@strata/types";
import type { TContextMenuItem } from "@strata/blocks/context-menu";
import { resolveItemVariant } from "@strata/blocks/context-menu";
// hooks
import { useUser } from "@/hooks/store/user";

type TCommentCard = {
  activityOperations: TCommentsOperations;
  comment: TIssueComment;
  setEditMode: () => void;
  showAccessSpecifier: boolean;
  showCopyLinkOption: boolean;
};

export const CommentQuickActions = observer(function CommentQuickActions(props: TCommentCard) {
  const { activityOperations, comment, setEditMode, showAccessSpecifier, showCopyLinkOption } = props;
  // store hooks
  const { data: currentUser } = useUser();
  // derived values
  const isAuthor = currentUser?.id === comment.actor;
  const canEdit = isAuthor;
  const canDelete = isAuthor;
  // translation
  const { t } = useTranslation();

  const MENU_ITEMS = useMemo(
    function MENU_ITEMS(): TContextMenuItem[] {
      return [
        {
          key: "edit",
          action: setEditMode,
          title: t("common.actions.edit"),
          icon: EditOutline,
          shouldRender: canEdit,
        },
        {
          key: "copy_link",
          action: () => activityOperations.copyCommentLink(comment.id),
          title: t("common.actions.copy_link"),
          icon: LinkOutline,
          shouldRender: showCopyLinkOption,
        },
        {
          key: "access_specifier",
          action: () =>
            activityOperations.updateComment(comment.id, {
              access:
                comment.access === EIssueCommentAccessSpecifier.INTERNAL
                  ? EIssueCommentAccessSpecifier.EXTERNAL
                  : EIssueCommentAccessSpecifier.INTERNAL,
            }),
          title:
            comment.access === EIssueCommentAccessSpecifier.INTERNAL
              ? t("issue.comments.switch.public")
              : t("issue.comments.switch.private"),
          icon: comment.access === EIssueCommentAccessSpecifier.INTERNAL ? GlobeOutline : LockOutline,
          shouldRender: showAccessSpecifier,
        },
        {
          key: "delete",
          action: () => activityOperations.removeComment(comment.id),
          title: t("common.actions.delete"),
          icon: DeleteOutline,
          shouldRender: canDelete,
        },
      ].filter((item) => item.shouldRender !== false);
    },
    [t, setEditMode, canEdit, showCopyLinkOption, activityOperations, comment, showAccessSpecifier, canDelete]
  );

  if (MENU_ITEMS.length === 0) return null;

  return (
    <Menu>
      <MenuTrigger
        render={
          <IconButton
            icon={<Icon icon={MoreHorizontalOutline} />}
            aria-label={t("common.options")}
            variant="ghost"
            size="xs"
          />
        }
      />
      <MenuContent side="bottom" align="end">
        {MENU_ITEMS.map((item) => (
          <MenuItem
            key={item.key}
            variant={resolveItemVariant(item)}
            label={item.title ?? ""}
            description={item.description}
            icon={item.icon ? <Icon icon={item.icon} /> : undefined}
            disabled={item.disabled}
            onClick={() => item.action()}
          />
        ))}
      </MenuContent>
    </Menu>
  );
});
