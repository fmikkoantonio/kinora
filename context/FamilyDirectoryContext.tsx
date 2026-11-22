import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface FamilyDirectoryMember {
  member_id: string;
  full_name: string;
}

export interface FamilyDirectoryGroupMember extends FamilyDirectoryMember {
  relationship: string;
  relationship_label: string;
  role: string;
}

export interface FamilyDirectoryGroup {
  group_id: string;
  group_name: string;
  relationship: string;
  role: string;
  members: FamilyDirectoryGroupMember[];
}

interface FamilyDirectoryValue {
  members: FamilyDirectoryMember[];
  groups: FamilyDirectoryGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const FamilyDirectoryContext = createContext<FamilyDirectoryValue | null>(null);

export function FamilyDirectoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyDirectoryMember[]>([]);
  const [groups, setGroups] = useState<FamilyDirectoryGroup[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const client = supabase;
    if (!user || !client) {
      setMembers([]);
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: groupsError } = await client.rpc("get_my_family_groups");
      if (groupsError) throw groupsError;

      const groupRows = (data ?? []) as Omit<FamilyDirectoryGroup, "members">[];
      const nextGroups = await Promise.all(groupRows.map(async (group) => {
        const { data: memberData, error: membersError } = await client.rpc("get_family_group_members_with_labels", {
          target_group_id: group.group_id,
        });
        if (membersError) throw membersError;
        return {
          ...group,
          members: (memberData ?? []) as FamilyDirectoryGroupMember[],
        };
      }));

      const uniqueMembers = new Map<string, FamilyDirectoryMember>();
      nextGroups.forEach((group) => {
        group.members.forEach((member) => uniqueMembers.set(member.member_id, {
          member_id: member.member_id,
          full_name: member.full_name,
        }));
      });
      setGroups(nextGroups);
      setMembers(Array.from(uniqueMembers.values()));
    } catch (directoryError) {
      setGroups([]);
      setMembers([]);
      setError(directoryError instanceof Error ? directoryError.message : "Could not load family members.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ members, groups, loading, error, refresh }), [members, groups, loading, error, refresh]);
  return <FamilyDirectoryContext.Provider value={value}>{children}</FamilyDirectoryContext.Provider>;
}

export function useFamilyDirectory(): FamilyDirectoryValue {
  const context = useContext(FamilyDirectoryContext);
  if (!context) throw new Error("useFamilyDirectory must be used within FamilyDirectoryProvider");
  return context;
}
