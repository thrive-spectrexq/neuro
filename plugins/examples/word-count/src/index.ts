export default class WordCountPlugin {
  name = "WordCountPlugin";
  
  init() {
    console.log("WordCountPlugin initialized");
  }

  count(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}
