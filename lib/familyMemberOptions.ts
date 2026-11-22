import type { DropdownOption } from "@/components/DropdownField";
import type { FamilyDirectoryGroup } from "@/context/FamilyDirectoryContext";

export function getFamilyMemberOptions(
  groups: FamilyDirectoryGroup[],
  currentUserId: string | undefined,
): DropdownOption[] {
  const memberContexts = new Map<string, { name: string; contexts: Set<string> }>();

  groups.forEach((group) => {
    group.members.forEach((member) => {
      const relationship = getViewerRelativeRelationship(group, member, currentUserId);
      const familyContext = group.role === "owner"
        ? `My family's ${relationship.toLowerCase()}`
        : `${group.group_name}'s family — ${relationship.toLowerCase()}`;
      const existing = memberContexts.get(member.member_id) ?? {
        name: member.full_name,
        contexts: new Set<string>(),
      };
      existing.contexts.add(familyContext);
      memberContexts.set(member.member_id, existing);
    });
  });

  return [
    { label: "All family members", value: null },
    ...Array.from(memberContexts, ([memberId, member]) => {
      const isCurrentUser = memberId === currentUserId;
      return {
        label: member.name,
        value: memberId,
        description: isCurrentUser ? "You" : Array.from(member.contexts).join(" · "),
      };
    }),
  ];
}

export function getViewerRelativeRelationship(
  group: FamilyDirectoryGroup,
  member: FamilyDirectoryGroup["members"][number],
  currentUserId: string | undefined,
): string {
  const memberRelationship = member.relationship.trim().toLowerCase();
  const viewerRelationship = group.relationship.trim().toLowerCase();
  const viewerIsChild = viewerRelationship === "child" || viewerRelationship === "son" || viewerRelationship === "daughter";
  const memberIsChild = memberRelationship === "child";

  if (
    group.role !== "owner"
    && member.member_id !== currentUserId
    && viewerIsChild
    && memberIsChild
  ) {
    const memberLabel = (member.relationship_label || "").trim().toLowerCase();
    if (memberLabel === "son") return "Brother";
    if (memberLabel === "daughter") return "Sister";
    if (memberLabel === "brother" || memberLabel === "sister") return memberLabel;
    return "Sibling";
  }

  return member.relationship_label || member.relationship || "family member";
}
