import {
  AIDS_END_MARKER,
  AIDS_START_MARKER,
} from "@/lib/chat/aids-prompt";

export type AidsStreamFilter = {
  /** 消费一段模型输出，返回可以展示给用户的正文。 */
  consume: (chunk: string) => string;
  /** 流结束时返回尚未展示的正文尾巴。 */
  finish: () => string;
  /** 是否看到过隐藏区块的开始标记。 */
  readonly foundStart: boolean;
  /** 隐藏区块中的原始 JSON 文本。 */
  readonly aidsRaw: string;
};

/**
 * 主回复和互动信息共用一个流。过滤器会扣住可能组成标记的尾部字符，
 * 避免用户短暂看到 `<<<ZY_AIDS>>>` 或后面的 JSON。
 */
export function createAidsStreamFilter(): AidsStreamFilter {
  let pending = "";
  let aidsRaw = "";
  let inAids = false;
  let finishedBlock = false;
  let foundStart = false;

  function consume(chunk: string) {
    if (!chunk) return "";
    pending += chunk;

    if (finishedBlock) {
      const visible = pending;
      pending = "";
      return visible;
    }

    let visible = "";

    if (!inAids) {
      const startIndex = pending.indexOf(AIDS_START_MARKER);
      if (startIndex >= 0) {
        visible += pending.slice(0, startIndex);
        pending = pending.slice(startIndex + AIDS_START_MARKER.length);
        inAids = true;
        foundStart = true;
      } else {
        const keep = AIDS_START_MARKER.length - 1;
        if (pending.length > keep) {
          visible += pending.slice(0, pending.length - keep);
          pending = pending.slice(pending.length - keep);
        }
        return visible;
      }
    }

    if (inAids) {
      const endIndex = pending.indexOf(AIDS_END_MARKER);
      if (endIndex >= 0) {
        aidsRaw += pending.slice(0, endIndex);
        pending = pending.slice(endIndex + AIDS_END_MARKER.length);
        inAids = false;
        finishedBlock = true;
        visible += pending;
        pending = "";
      } else {
        const keep = AIDS_END_MARKER.length - 1;
        if (pending.length > keep) {
          aidsRaw += pending.slice(0, pending.length - keep);
          pending = pending.slice(pending.length - keep);
        }
      }
    }

    return visible;
  }

  function finish() {
    if (finishedBlock) {
      const visible = pending;
      pending = "";
      return visible;
    }
    if (inAids) {
      aidsRaw += pending;
      pending = "";
      return "";
    }
    const visible = pending;
    pending = "";
    return visible;
  }

  return {
    consume,
    finish,
    get foundStart() {
      return foundStart;
    },
    get aidsRaw() {
      return aidsRaw;
    },
  };
}
