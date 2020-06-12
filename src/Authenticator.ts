interface Authenticator {
  key: string;
  create: (event: any) => Promise<any>;
  verify: (event: any) => Promise<any>;
}
