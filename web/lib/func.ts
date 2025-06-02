// base64转arraybuffer
export function base64ToArrayBuffer(base64String: string): ArrayBuffer {
    const binaryString = window.atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// blob转base64
 export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // 去掉 data:image/png;base64, 这样的前缀
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to read Blob as Base64'));
        }
      };
      reader.onerror = () => {
        reject(reader.error);
      };
      reader.readAsDataURL(blob);
    });
  }

// tts文字前处理
export function ttsTextPreprocess(text: string): string {
    const regex = /([\u4e00-\u9fa5a-zA-Z0-9\u3002\uFF0C\uFF1F\uFF01\uFF1A\u002E\u002C\u003F\u0021\u003A\u005B\u005D\u0028\u0029\\s\\]+)/g;
    // \u4e00-\u9fa5 对应中文字符
    // a-zA-Z 对应英文字符
    // 0-9 对应数字
    // \u3002 对应全角句号“。”
    // \u3002 对应全角句号“。”
    // \uFF0C 对应全角逗号“，”
    // \uFF1F 对应全角问号“？”
    // \uFF01 对应全角感叹号“！”
    // \uFF1A 对应全角冒号“：”
    // \u002E 对应半角句号“.”
    // \u002C 对应半角逗号“,”
    // \u003F 对应半角问号“?”
    // \u0021 对应半角感叹号“!”
    // \u003A 对应半角冒号“:”
    // \u005B 对应左方括号“[”
    // \u005D 对应右方括号“]”
    // \u0028 对应左圆括号“(”
    // \u0029 对应右圆括号“)”
    // \\ 对应 反斜杠“\”
    // \s 对应 空格

    const matches = text.match(regex);
    
    const processedText = matches ? matches.join(' ') : '';
    // const processedText = "\t当然！这是一个关于数字的笑话：\n\n为什么数字 7 总是觉得冷？\n"
    // 将换行符替换为句号
    const processedFilterText = processedText.replace(/\\n/g, ' ');
    // 将所有非中文字符或英文或则指定标签符号外的替换为空格
    return processedFilterText.trim();
}