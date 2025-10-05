export async function publicKeyStorageGet(_acl: `0x${string}`) {
  return { publicKey: "0x00", publicParams: "0x00" };
}

export async function publicKeyStorageSet(_acl: `0x${string}`, _pub: string, _params: string) {
  return true;
}


