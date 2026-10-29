declare module "png-chunk-text" {
  export function decode(data: Uint8Array): {
    keyword: string;
    text: string;
  };
  export function encode(keyword: string, text: string): Uint8Array;
}
