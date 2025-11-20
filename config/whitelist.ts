const whitelist = [
  "*@flapjack.co",
  "m.mubinkhalid@gmail.com",
  "fahad.ashraf.sultan@gmail.com",
  "haseeb.mansoor8@gmail.com",
];
export const isWhitelistedUser = (userEmail: string) => {
  if (!userEmail) return false;

  return whitelist.some((pattern) => {
    if (pattern.includes("*")) {
      const domain = pattern.replace("*", "");
      return userEmail.endsWith(domain);
    }
    return userEmail === pattern;
  });
};
