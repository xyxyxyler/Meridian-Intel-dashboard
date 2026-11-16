declare module 'world-atlas/countries-110m.json' {
  const topology: {
    type: 'Topology';
    objects: {
      countries: {
        type: 'GeometryCollection';
        geometries: Array<{
          type: string;
          id?: string;
          properties: {
            name: string;
          };
        }>;
      };
      land: unknown;
    };
    arcs: number[][][];
    transform?: {
      scale: [number, number];
      translate: [number, number];
    };
  };
  export default topology;
}
