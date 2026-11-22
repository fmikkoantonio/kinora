import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Card, Screen } from "@/components/Screen";
import { DropdownField, DropdownOption } from "@/components/DropdownField";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { colors } from "@/constants/theme";
import { getUserDisplayName, useAuth } from "@/context/AuthContext";
import { FamilyDirectoryGroup, useFamilyDirectory } from "@/context/FamilyDirectoryContext";
import { supabase } from "@/lib/supabase";
import { getViewerRelativeRelationship } from "@/lib/familyMemberOptions";
import { FamilyGender, getMemberRelationshipLabel } from "@/lib/familyRelationships";

type IncomingInvitation = {
  id?: string;
  invitation_id?: string;
  group_id?: string;
  group_name?: string;
  inviter_id?: string;
  inviter_name?: string;
  relationship?: string;
  inviter_relationship_label?: string;
};

type SentInvitation = {
  id?: string;
  invitation_id?: string;
  invitee_email?: string;
  relationship?: string;
  inviter_relationship?: string;
  status?: string;
};

const relationshipOptions: DropdownOption[] = [
  { label: "Spouse", value: "spouse" },
  { label: "Child", value: "child" },
  { label: "Parent", value: "parent" },
  { label: "Grandchild", value: "grandchild" },
  { label: "Grandparent", value: "grandparent" },
  { label: "Sibling", value: "sibling" },
  { label: "Aunt", value: "aunt" },
  { label: "Uncle", value: "uncle" },
  { label: "Niece", value: "niece" },
  { label: "Nephew", value: "nephew" },
  { label: "Caregiver", value: "caregiver" },
  { label: "Other", value: "other" },
];

export default function FamilyScreen() {
  const { groupId: groupParam } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const requestedGroupId = Array.isArray(groupParam) ? groupParam[0] : groupParam;
  const { user } = useAuth();
  const directory = useFamilyDirectory();
  const { groups } = directory;
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(requestedGroupId ?? null);
  const appliedRequestedGroupId = useRef<string | null>(null);
  const [incoming, setIncoming] = useState<IncomingInvitation[]>([]);
  const [sent, setSent] = useState<SentInvitation[]>([]);
  const [profileGender, setProfileGender] = useState<FamilyGender>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [relationship, setRelationship] = useState<string | null>(null);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [hasLoadedInvitations, setHasLoadedInvitations] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [membershipActionId, setMembershipActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      requestedGroupId &&
      requestedGroupId !== appliedRequestedGroupId.current &&
      groups.some((group) => group.group_id === requestedGroupId)
    ) {
      appliedRequestedGroupId.current = requestedGroupId;
      setSelectedGroupId(requestedGroupId);
    } else if (groups.length && !groups.some((group) => group.group_id === selectedGroupId)) {
      setSelectedGroupId(groups[0].group_id);
    }
  }, [groups, requestedGroupId, selectedGroupId]);

  const selectedGroup = groups.find((group) => group.group_id === selectedGroupId) ?? null;
  const groupOptions = useMemo<DropdownOption[]>(() => groups.map((group) => ({
    label: group.group_name,
    value: group.group_id,
    description: group.role === "owner" ? "Owner" : getMemberRelationshipLabel(group.relationship, profileGender),
  })), [groups, profileGender]);

  useEffect(() => {
    let active = true;
    async function loadGender() {
      if (!supabase || !user) {
        setProfileGender(null);
        return;
      }
      try {
        const { data, error: genderError } = await supabase.rpc("get_my_profile_gender");
        if (genderError) throw genderError;
        if (!active) return;
        const value = typeof data === "string"
          ? data
          : data && typeof data === "object" && "gender" in data && typeof data.gender === "string"
            ? data.gender
            : null;
        setProfileGender(
          value === "male" || value === "female" || value === "non_binary" || value === "prefer_not_to_say"
            ? value
            : null,
        );
      } catch (genderError) {
        if (active) {
          Alert.alert(
            "Could not load gender preference",
            genderError instanceof Error ? genderError.message : "Please try again.",
          );
        }
      }
    }
    void loadGender();
    return () => { active = false; };
  }, [user?.id]);

  async function loadInvitations(group: FamilyDirectoryGroup | null) {
    if (!supabase || !user) {
      setIncoming([]);
      setSent([]);
      setLoadingInvitations(false);
      setHasLoadedInvitations(true);
      return;
    }
    setLoadingInvitations(true);
    setError(null);
    try {
      if (!user.email) {
        setIncoming([]);
        setSent([]);
        setError("This account has no email address to match family invitations.");
        return;
      }
      const { data: incomingData, error: incomingError } = await supabase
        .from("family_group_invitations")
        .select("*")
        .eq("invitee_email", user.email.toLowerCase())
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const sentResult = group?.role === "owner"
        ? await supabase.from("family_group_invitations").select("*").eq("group_id", group.group_id).eq("status", "pending").order("created_at", { ascending: false })
        : { data: [], error: null };
      if (incomingError || sentResult.error) {
        throw new Error(incomingError?.message ?? sentResult.error?.message ?? "Could not load family invitations.");
      }
      setIncoming((incomingData ?? []) as IncomingInvitation[]);
      setSent((sentResult.data ?? []) as SentInvitation[]);
    } catch (invitationError) {
      setIncoming([]);
      setSent([]);
      setError(invitationError instanceof Error ? invitationError.message : "Could not load family invitations.");
    } finally {
      setLoadingInvitations(false);
      setHasLoadedInvitations(true);
    }
  }

  useEffect(() => {
    void loadInvitations(selectedGroup);
    // Keep the request tied to the active family group.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup?.group_id, selectedGroup?.role, user?.id]);

  async function refreshAll() {
    setRefreshingAll(true);
    try {
      await directory.refresh();
      await loadInvitations(selectedGroup);
    } finally {
      setRefreshingAll(false);
    }
  }

  async function sendInvitation() {
    if (!supabase || !user || !selectedGroup || selectedGroup.role !== "owner") return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (email === user?.email?.toLowerCase()) {
      setError("You cannot invite your own account.");
      return;
    }
    if (!relationship) {
      setError("Choose the family member’s relationship to you.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const { data: existing, error: existingError } = await supabase
        .from("family_group_invitations")
        .select("id")
        .eq("group_id", selectedGroup.group_id)
        .eq("invitee_email", email)
        .eq("status", "pending")
        .limit(1);
      if (existingError) throw existingError;
      if ((existing ?? []).length) {
        setError("An invitation is already pending for this email.");
        return;
      }

      const { error: inviteError } = await supabase
        .from("family_group_invitations")
        .insert({
          group_id: selectedGroup.group_id,
          inviter_id: user.id,
          invitee_email: email,
          relationship,
          inviter_name: getUserDisplayName(user),
          status: "pending",
        });
      if (inviteError) throw inviteError;
      setInviteEmail("");
      setRelationship(null);
      await loadInvitations(selectedGroup);
      Alert.alert("Invitation sent", "The invitation is now available in the other account’s Family tab.");
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not send the invitation.");
    } finally {
      setSending(false);
    }
  }

  async function respondToInvitation(invitation: IncomingInvitation, action: "accept" | "decline") {
    if (!supabase) return;
    const id = invitation.id ?? invitation.invitation_id;
    if (!id) {
      setError("This invitation is missing its ID. Refresh and try again.");
      return;
    }
    const { error: responseError } = await supabase.rpc(
      action === "accept" ? "accept_family_invitation" : "decline_family_invitation",
      { target_invitation_id: id },
    );
    if (responseError) {
      Alert.alert("Could not update invitation", responseError.message);
      return;
    }
    await refreshAll();
  }

  async function removeMember(memberId: string, memberName: string) {
    if (!supabase || !selectedGroup || selectedGroup.role !== "owner") return;
    setMembershipActionId(memberId);
    setError(null);
    try {
      const { error: removeError } = await supabase.rpc("remove_family_group_member", {
        target_group_id: selectedGroup.group_id,
        target_member_id: memberId,
      });
      if (removeError) throw removeError;
      await refreshAll();
      Alert.alert("Member removed", `${memberName} was removed from ${selectedGroup.group_name}.`);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove the family member.");
    } finally {
      setMembershipActionId(null);
    }
  }

  function confirmRemoveMember(memberId: string, memberName: string) {
    if (!selectedGroup) return;
    Alert.alert(
      "Remove family member?",
      `${memberName} will lose access to ${selectedGroup.group_name} and its shared records.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => void removeMember(memberId, memberName) },
      ],
    );
  }

  async function leaveGroup() {
    if (!supabase || !selectedGroup || selectedGroup.role === "owner") return;
    setMembershipActionId(selectedGroup.group_id);
    setError(null);
    try {
      const { error: leaveError } = await supabase.rpc("leave_family_group", {
        target_group_id: selectedGroup.group_id,
      });
      if (leaveError) throw leaveError;
      await directory.refresh();
      const remainingGroup = groups.find((group) => group.group_id !== selectedGroup.group_id);
      setSelectedGroupId(remainingGroup?.group_id ?? null);
      Alert.alert("Left family group", `You left ${selectedGroup.group_name}.`);
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : "Could not leave the family group.");
    } finally {
      setMembershipActionId(null);
    }
  }

  function confirmLeaveGroup() {
    if (!selectedGroup) return;
    Alert.alert(
      "Leave family group?",
      `You will lose access to ${selectedGroup.group_name} and its shared records.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => void leaveGroup() },
      ],
    );
  }

  function revokeInvitation(invitation: SentInvitation) {
    const id = invitation.id ?? invitation.invitation_id;
    if (!id || !supabase) {
      setError("This invitation is missing its ID.");
      return;
    }
    Alert.alert("Revoke invitation?", "The invited account will no longer be able to accept it.", [
      { text: "Keep invitation", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: () => {
          void supabase!.rpc("revoke_family_invitation", { target_invitation_id: id }).then(async ({ error: revokeError }) => {
            if (revokeError) Alert.alert("Could not revoke invitation", revokeError.message);
            else await loadInvitations(selectedGroup);
          });
        },
      },
    ]);
  }

  return (
    <Screen
      refreshing={directory.loading || loadingInvitations || refreshingAll}
      onRefresh={() => void refreshAll()}
    >
      <View>
        <Text style={styles.eyebrow}>SHARE HEALTH RECORDS</Text>
        <Text style={styles.title}>Family</Text>
        <Text style={styles.subtitle}>Manage groups and people who can see your records.</Text>
      </View>

      {directory.loading || refreshingAll || (loadingInvitations && !hasLoadedInvitations) ? (
        <FamilyPageSkeleton isOwner={selectedGroup?.role === "owner"} />
      ) : (
      <>
      <View style={styles.field}>
        <Text style={styles.label}>FAMILY GROUP</Text>
        {groupOptions.length ? (
          <DropdownField label="Family group" value={selectedGroupId} options={groupOptions} onChange={setSelectedGroupId} searchable />
        ) : (
          <Card><Text style={styles.emptyText}>{directory.error ?? "No family groups are available for this account."}</Text></Card>
        )}
      </View>

      {selectedGroup ? (
        <Card style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupIcon}><Ionicons name="people" size={20} color={colors.primary} /></View>
            <View style={styles.groupCopy}>
              <Text style={styles.groupName}>{selectedGroup.group_name}</Text>
              <Text style={styles.groupRole}>{selectedGroup.role === "owner" ? "You manage this group" : "Shared family group"}</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Members</Text>
          {selectedGroup.members.map((member) => (
            <View key={member.member_id} style={styles.memberRow}>
              <View style={styles.memberAvatar}><Ionicons name="person-outline" size={16} color={colors.primary} /></View>
              <View style={styles.memberCopy}>
                <Text style={styles.memberName}>{member.member_id === user?.id ? `${member.full_name} (You)` : member.full_name}</Text>
                <Text style={styles.memberRelationship}>{getViewerRelativeRelationship(selectedGroup, member, user?.id)}</Text>
              </View>
              {selectedGroup.role === "owner" && member.member_id !== user?.id ? (
                <Pressable
                  onPress={() => confirmRemoveMember(member.member_id, member.full_name)}
                  disabled={membershipActionId === member.member_id}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${member.full_name}`}
                  style={[styles.removeButton, membershipActionId === member.member_id && styles.disabled]}
                >
                  <Text style={styles.removeButtonText}>{membershipActionId === member.member_id ? "Removing…" : "Remove"}</Text>
                </Pressable>
              ) : (
                <Text style={styles.roleTag}>{member.role === "owner" ? "Owner" : "Member"}</Text>
              )}
            </View>
          ))}
        </Card>
      ) : null}

      {selectedGroup?.role === "member" ? (
        <Card style={styles.leaveCard}>
          <View style={styles.leaveCopy}>
            <Text style={styles.leaveTitle}>Leave this family group</Text>
            <Text style={styles.helper}>You will lose access to the group and its shared records.</Text>
          </View>
          <Pressable
            onPress={confirmLeaveGroup}
            disabled={membershipActionId === selectedGroup.group_id}
            accessibilityRole="button"
            style={[styles.leaveButton, membershipActionId === selectedGroup.group_id && styles.disabled]}
          >
            <Text style={styles.leaveButtonText}>{membershipActionId === selectedGroup.group_id ? "Leaving…" : "Leave"}</Text>
          </Pressable>
        </Card>
      ) : null}

      {selectedGroup?.role === "owner" ? (
        <Card style={styles.inviteCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Invite a family member</Text>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.helper}>Send an in-app invitation to an account’s sign-in email.</Text>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="family@example.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Text style={styles.label}>RELATIONSHIP TO YOU</Text>
          <DropdownField label="Relationship" value={relationship} options={relationshipOptions} onChange={setRelationship} />
          <Pressable onPress={() => void sendInvitation()} disabled={sending} style={[styles.sendButton, sending && styles.disabled]}>
            <Text style={styles.sendButtonText}>{sending ? "Sending…" : "Send invitation"}</Text>
          </Pressable>
        </Card>
      ) : null}

      {incoming.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invitations for you</Text>
          {incoming.map((invitation) => {
            const id = invitation.id ?? invitation.invitation_id ?? `${invitation.group_id}-${invitation.inviter_name}`;
            return (
              <Card key={id} style={styles.invitationCard}>
                <Text style={styles.invitationTitle}>{invitation.group_name ?? "Family group invitation"}</Text>
                <Text style={styles.helper}>
                  {invitation.inviter_name ?? "A family member"} invited you
                  {invitation.relationship
                    ? ` as ${getMemberRelationshipLabel(invitation.relationship, profileGender)}`
                    : " to join their family"}.
                </Text>
                <View style={styles.invitationActions}>
                  <Pressable onPress={() => void respondToInvitation(invitation, "decline")} style={styles.declineButton}><Text style={styles.declineText}>Decline</Text></Pressable>
                  <Pressable onPress={() => void respondToInvitation(invitation, "accept")} style={styles.acceptButton}><Text style={styles.acceptText}>Accept</Text></Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}

      {selectedGroup?.role === "owner" && sent.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending invitations</Text>
          {sent.map((invitation) => {
            const id = invitation.id ?? invitation.invitation_id ?? invitation.invitee_email;
            return (
              <Card key={id} style={styles.sentRow}>
                <View style={styles.sentCopy}>
                  <Text style={styles.sentEmail}>{invitation.invitee_email ?? "Invited family member"}</Text>
                  <Text style={styles.helper}>{invitation.inviter_relationship ?? invitation.relationship ?? "Family member"}</Text>
                </View>
                <Pressable onPress={() => revokeInvitation(invitation)} accessibilityRole="button" accessibilityLabel="Revoke invitation">
                  <Ionicons name="close-circle-outline" size={21} color="#B42318" />
                </Pressable>
              </Card>
            );
          })}
        </View>
      ) : null}

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}><Text style={styles.dismiss}>Dismiss</Text></Pressable>
        </Card>
      ) : null}
      {!loadingInvitations && !incoming.length && (!selectedGroup || selectedGroup.role !== "owner" || !sent.length) ? (
        <Text style={styles.inviteNote}>In-app invitations are delivered to the invited account’s Family tab. No email is sent.</Text>
      ) : null}
      </>
      )}
    </Screen>
  );
}

function FamilyPageSkeleton({ isOwner }: { isOwner: boolean }) {
  return (
    <>
      <View style={styles.field} accessibilityLabel="Loading family groups">
        <Text style={styles.label}>FAMILY GROUP</Text>
        <SkeletonBlock height={48} borderRadius={13} />
      </View>

      <Card style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <SkeletonBlock width={42} height={42} borderRadius={14} />
          <View style={styles.groupCopy}>
            <SkeletonBlock width="58%" height={13} />
            <SkeletonBlock width="38%" height={10} />
          </View>
        </View>
        <SkeletonBlock width={72} height={12} />
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.memberRow}>
            <SkeletonBlock width={32} height={32} borderRadius={11} />
            <View style={styles.memberCopy}>
              <SkeletonBlock width="58%" height={11} />
              <SkeletonBlock width="38%" height={10} />
            </View>
            <SkeletonBlock width={46} height={21} borderRadius={9} />
          </View>
        ))}
      </Card>

      {isOwner ? (
        <Card style={styles.inviteCard}>
          <View style={styles.sectionHeader}>
            <SkeletonBlock width={154} height={13} />
            <SkeletonBlock width={18} height={18} borderRadius={9} />
          </View>
          <SkeletonBlock width="88%" height={10} />
          <SkeletonBlock width={86} height={9} />
          <SkeletonBlock height={46} borderRadius={12} />
          <SkeletonBlock width={126} height={9} />
          <SkeletonBlock height={46} borderRadius={12} />
          <SkeletonBlock height={46} borderRadius={13} />
        </Card>
      ) : null}

      <View style={styles.section} accessibilityLabel="Loading invitations">
        <SkeletonBlock width={142} height={13} />
        <Card style={styles.invitationCard}>
          <SkeletonBlock width="65%" height={12} />
          <SkeletonBlock width="92%" height={10} />
          <View style={styles.invitationActions}>
            <SkeletonBlock width={70} height={39} borderRadius={11} />
            <SkeletonBlock width={78} height={39} borderRadius={11} />
          </View>
        </Card>
      </View>

      {isOwner ? (
        <View style={styles.section} accessibilityLabel="Loading pending invitations">
          <SkeletonBlock width={132} height={13} />
          <Card style={styles.sentRow}>
            <View style={styles.sentCopy}>
              <SkeletonBlock width="66%" height={11} />
              <SkeletonBlock width="38%" height={10} />
            </View>
            <SkeletonBlock width={21} height={21} borderRadius={11} />
          </Card>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  groupCard: { gap: 14 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  groupIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryLight },
  groupCopy: { flex: 1, gap: 3 },
  groupName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  groupRole: { color: colors.muted, fontSize: 10 },
  section: { gap: 9 },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  memberRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  memberAvatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { color: colors.text, fontSize: 11, fontWeight: "800" },
  memberRelationship: { color: colors.muted, fontSize: 10 },
  roleTag: { color: colors.primary, fontSize: 9, fontWeight: "800", backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9 },
  removeButton: { minHeight: 31, paddingHorizontal: 9, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: "#FDECEC" },
  removeButtonText: { color: "#B42318", fontSize: 9, fontWeight: "800" },
  leaveCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  leaveCopy: { flex: 1, gap: 4 },
  leaveTitle: { color: colors.text, fontSize: 11, fontWeight: "800" },
  leaveButton: { minHeight: 38, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "#B42318" },
  leaveButtonText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  inviteCard: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  input: { minHeight: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, fontSize: 12 },
  sendButton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.primary, marginTop: 2 },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  invitationCard: { gap: 8 },
  invitationTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  invitationActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 4 },
  declineButton: { minHeight: 39, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "#F3F6F8" },
  declineText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  acceptButton: { minHeight: 39, paddingHorizontal: 17, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.primary },
  acceptText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  sentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sentCopy: { flex: 1, gap: 4 },
  sentEmail: { color: colors.text, fontSize: 11, fontWeight: "800" },
  errorCard: { borderColor: "#F4C7C4" },
  errorText: { color: "#B42318", fontSize: 11, lineHeight: 16 },
  dismiss: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  inviteNote: { color: colors.muted, fontSize: 10, textAlign: "center", lineHeight: 15 },
});
