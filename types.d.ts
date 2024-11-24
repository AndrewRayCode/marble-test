// Teach Typescript it's ok to import static files
declare module '*.mp3' {
  const src: string;
  export default src;
}
