import { PUBLIC_SRC_PATH } from "./constants";

export function getSrcPath(src: string) {
  return `${PUBLIC_SRC_PATH}${src}`;
}