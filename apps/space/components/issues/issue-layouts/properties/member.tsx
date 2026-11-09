/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// strata imports
import { MemberSelect } from "@strata/blocks/property-select";
import type { MemberOption, MemberSelectVariant } from "@strata/blocks/property-select";
import { useTranslation } from "@strata/i18n";
import { cn, getFileURL } from "@strata/utils";
// helpers
import { READ_ONLY_SELECT_CLASSNAME, toSinglePage } from "@/helpers/select.helper";
// hooks
import { useMember } from "@/hooks/store/use-member";
// types
import type { TPublicMember } from "@/types/member";

type Props = {
  memberIds: string[];
  variant?: MemberSelectVariant;
  placeholder?: string;
  className?: string;
};

const toMemberOption = (member: TPublicMember): MemberOption => ({
  id: member.member,
  display_name: member.member__display_name,
  avatar_url: member.member__avatar ? getFileURL(member.member__avatar) : undefined,
});

/** The work item assignees as a read-only `MemberSelect` chip: faces when assigned, an icon when not. */
export const IssueBlockMembers = observer(function IssueBlockMembers(props: Props) {
  const { memberIds, variant, placeholder, className } = props;
  // i18n
  const { t } = useTranslation();
  // store hooks
  const { members, getMembersByIds } = useMember();
  // derived values
  const selectedMembers = getMembersByIds(memberIds ?? []).map(toMemberOption);

  return (
    <MemberSelect
      multiple
      getValues={() => toSinglePage(members?.map(toMemberOption))}
      value={selectedMembers}
      onChange={() => {}}
      variant={variant ?? (selectedMembers.length > 0 ? "avatar-group-md" : "pill-md")}
      placeholder={placeholder}
      className={cn(READ_ONLY_SELECT_CLASSNAME, className)}
      tooltip={{ heading: t("common.assignees"), emptyContent: t("common.none") }}
      disabled
    />
  );
});
