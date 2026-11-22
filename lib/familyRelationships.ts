export type FamilyGender = "male" | "female" | "non_binary" | "prefer_not_to_say" | null;

export function getChildLabel(gender: FamilyGender): string {
  if (gender === "male") return "Son";
  if (gender === "female") return "Daughter";
  return "Child";
}

export function getParentLabel(gender: FamilyGender): string {
  if (gender === "male") return "Father";
  if (gender === "female") return "Mother";
  return "Parent";
}

export function getGrandparentLabel(gender: FamilyGender): string {
  if (gender === "male") return "Grandfather";
  if (gender === "female") return "Grandmother";
  return "Grandparent";
}

export function getGrandchildLabel(gender: FamilyGender): string {
  if (gender === "male") return "Grandson";
  if (gender === "female") return "Granddaughter";
  return "Grandchild";
}

export function getNieceOrNephewLabel(gender: FamilyGender): string {
  if (gender === "male") return "Nephew";
  if (gender === "female") return "Niece";
  return "Niece or nephew";
}

export function getAuntOrUncleLabel(gender: FamilyGender): string {
  if (gender === "male") return "Uncle";
  if (gender === "female") return "Aunt";
  return "Aunt or uncle";
}

export function getMemberRelationshipLabel(relationship: string, gender: FamilyGender): string {
  switch (relationship.trim().toLowerCase()) {
    case "child":
      return getChildLabel(gender);
    case "parent":
      return getParentLabel(gender);
    case "grandchild":
      return getGrandchildLabel(gender);
    case "grandparent":
      return getGrandparentLabel(gender);
    default:
      return relationship;
  }
}

export function getReciprocalRelationshipLabel(
  relationship: string,
  ownerGender: FamilyGender,
): string {
  switch (relationship.trim().toLowerCase()) {
    case "child":
      return getParentLabel(ownerGender);
    case "mother":
    case "father":
    case "parent":
      return getChildLabel(ownerGender);
    case "grandchild":
      return getGrandparentLabel(ownerGender);
    case "grandparent":
      return getGrandchildLabel(ownerGender);
    case "aunt":
    case "uncle":
      return getNieceOrNephewLabel(ownerGender);
    case "niece":
    case "nephew":
      return getAuntOrUncleLabel(ownerGender);
    case "caregiver":
      return "Care recipient";
    default:
      return relationship;
  }
}
