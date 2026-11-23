import User from "../models/userModel.js";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

function replacementUsername(name: string, id: string, reserved: Set<string>): string {
  const base = name.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 7) || "student";
  const suffix = id.slice(-12).toLowerCase();
  let candidate = `${base}_${suffix}`;
  let counter = 0;
  while (reserved.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base.slice(0, 5)}_${suffix.slice(-9)}${counter.toString(36)}`;
  }
  return candidate;
}

/** Preserve names and emails; archive any invalid or duplicate legacy handle before replacing it. */
export async function migrateUsernames(collection = User.collection): Promise<void> {
  const users = await collection.find({}, { projection: { _id: 1, name: 1, username: 1, legacyUsername: 1 } }).sort({ _id: 1 }).toArray();
  const reserved = new Set(users.filter((user) => typeof user.username === "string").map((user) => user.username.toLowerCase()));
  const retained = new Set<string>();

  for (const user of users) {
    const id = user._id.toString();
    const previous = typeof user.username === "string" ? user.username : undefined;
    const normalized = previous?.trim().toLowerCase();
    if (normalized && USERNAME_PATTERN.test(normalized) && !retained.has(normalized)) {
      retained.add(normalized);
      if (previous !== normalized) await collection.updateOne({ _id: user._id }, { $set: { username: normalized } });
      continue;
    }

    const username = replacementUsername(typeof user.name === "string" ? user.name : "student", id, reserved);
    reserved.add(username.toLowerCase());
    retained.add(username.toLowerCase());
    const set: Record<string, string> = { username };
    if (previous !== undefined && user.legacyUsername === undefined) set.legacyUsername = previous;
    await collection.updateOne({ _id: user._id }, { $set: set });
  }

  await collection.createIndex({ username: 1 }, {
    unique: true,
    collation: { locale: "en", strength: 2 },
    partialFilterExpression: { username: { $type: "string" } },
  });
  await collection.createIndex({ email: 1 }, { unique: true });
}
