export interface NeuroPlugin {
  name: string;
  init(): void;
}

export default class BasicPlugin implements NeuroPlugin {
  name = "BasicPlugin";
  init() {
    console.log(`${this.name} initialized`);
  }
}
