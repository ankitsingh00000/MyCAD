import React, { useState, useRef } from "react";
import {
  Stage,
  Layer,
  Line,
  Circle,
  Rect,
  Text,
  Arc,
} from "react-konva";
import "./App.css";

function App() {
  const [tool, setTool] = useState("select");

  const [objects, setObjects] = useState([]);

  const [selectedIndex, setSelectedIndex] = useState(null);

  const [commandFirstIndex, setCommandFirstIndex] = useState(null);

  const [isDrawing, setIsDrawing] = useState(false);

  const [layers, setLayers] = useState([
    {
      id: "layer-0",
      name: "Layer 0",
      visible: true,
    },
  ]);

  const [activeLayerId, setActiveLayerId] =
    useState("layer-0");

  const [measureStart, setMeasureStart] =
    useState(null);

  const [measurements, setMeasurements] =
    useState([]);

  const [scale, setScale] = useState(1);

  const [position, setPosition] = useState({
    x: 0,
    y: 0,
  });

  const [mousePosition, setMousePosition] =
    useState({
      x: 0,
      y: 0,
    });

  const [past, setPast] = useState([]);

  const [future, setFuture] = useState([]);

  const actionStartRef = useRef(null);

  const stageRef = useRef(null);

  const stretchStartRef = useRef(null);

  const GRID_SIZE = 25;

  const snapToGrid = (value) => {
    return (
      Math.round(value / GRID_SIZE) *
      GRID_SIZE
    );
  };

  /* =========================
     HISTORY
  ========================= */

  const saveHistory = (
    previousObjects,
    previousMeasurements
  ) => {
    setPast((prev) => [
      ...prev,
      {
        objects: previousObjects,
        measurements: previousMeasurements,
      },
    ]);

    setFuture([]);
  };

  const undo = () => {
    if (past.length === 0) return;

    const previousState =
      past[past.length - 1];

    setFuture((prev) => [
      ...prev,
      {
        objects: [...objects],
        measurements: [...measurements],
      },
    ]);

    setObjects(previousState.objects);

    setMeasurements(
      previousState.measurements
    );

    setPast((prev) =>
      prev.slice(0, -1)
    );

    setSelectedIndex(null);
    setCommandFirstIndex(null);
    setMeasureStart(null);
  };

  const redo = () => {
    if (future.length === 0) return;

    const nextState =
      future[future.length - 1];

    setPast((prev) => [
      ...prev,
      {
        objects: [...objects],
        measurements: [...measurements],
      },
    ]);

    setObjects(nextState.objects);

    setMeasurements(
      nextState.measurements
    );

    setFuture((prev) =>
      prev.slice(0, -1)
    );

    setSelectedIndex(null);
    setCommandFirstIndex(null);
    setMeasureStart(null);
  };

  /* =========================
     MOUSE DOWN
  ========================= */

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();

    if (!stage) return;

    const point =
      stage.getPointerPosition();

    if (!point) return;

    const rawX =
      (point.x - position.x) /
      scale;

    const rawY =
      (point.y - position.y) /
      scale;

    setMousePosition({
      x: Math.round(rawX),
      y: Math.round(rawY),
    });

    const x = snapToGrid(rawX);
    const y = snapToGrid(rawY);

    if (
      tool === "select" ||
      tool === "move" ||
      tool === "copy" ||
      tool === "rotate" ||
      tool === "trim" ||
      tool === "extend" ||
      tool === "stretch" ||
      tool === "offset" ||
      tool === "fillet" ||
      tool === "chamfer" ||
      tool === "array" ||
      tool === "mirror" ||
      tool === "scale" ||
      tool === "explode" ||
      tool === "join"
    ) {
      return;
    }

        if (tool === "polyline") {
      setObjects((prev) => {
        const lastObject =
          prev[prev.length - 1];

        if (
          lastObject &&
          lastObject.type === "polyline" &&
          isDrawing
        ) {
          const updated = [...prev];

          const current = {
            ...lastObject,
          };

          current.points = [
            ...current.points,
            x,
            y,
          ];

          updated[
            updated.length - 1
          ] = current;

          return updated;
        }

        return [
          ...prev,
          {
            type: "polyline",
            points: [
              x,
              y,
            ],
            rotation: 0,
            color: "#ffffff",
            strokeWidth: 2,
            layerId: activeLayerId,
          },
        ];
      });

      setIsDrawing(true);

      return;
    }

    /* =========================
       MEASURE
    ========================= */

    if (tool === "measure") {
      if (!measureStart) {
        actionStartRef.current = {
          objects: [...objects],
          measurements: [...measurements],
        };

        setMeasureStart({
          x,
          y,
        });

        return;
      }

      const dx =
        x - measureStart.x;

      const dy =
        y - measureStart.y;

      const distance = Math.sqrt(
        dx * dx + dy * dy
      );

      const newMeasurement = {
        x1: measureStart.x,
        y1: measureStart.y,
        x2: x,
        y2: y,
        distance: Math.round(distance),
      };

      setMeasurements((prev) => [
        ...prev,
        newMeasurement,
      ]);

      if (actionStartRef.current) {
        saveHistory(
          actionStartRef.current.objects,
          actionStartRef.current.measurements
        );
      }

      actionStartRef.current = null;

      setMeasureStart(null);

      return;
    }

    /* =========================
       START DRAWING
    ========================= */

    actionStartRef.current = {
      objects: [...objects],
      measurements: [...measurements],
    };

    setIsDrawing(true);

    if (tool === "line") {
      setObjects((prev) => [
        ...prev,
        {
          type: "line",
          points: [
            x,
            y,
            x,
            y,
          ],
          rotation: 0,
          color: "#ffffff",
          strokeWidth: 2,
          layerId: activeLayerId,
        },
      ]);
    }

    if (tool === "circle") {
      setObjects((prev) => [
        ...prev,
        {
          type: "circle",
          x,
          y,
          radius: 0,
          rotation: 0,
          color: "#ffffff",
          strokeWidth: 2,
          layerId: activeLayerId,
        },
      ]);
    }

    if (tool === "rectangle") {
      setObjects((prev) => [
        ...prev,
        {
          type: "rectangle",
          x,
          y,
          width: 0,
          height: 0,
          rotation: 0,
          color: "#ffffff",
          strokeWidth: 2,
          layerId: activeLayerId,
        },
      ]);
    }
  };

  /* =========================
     MOUSE MOVE
  ========================= */

  const handleMouseMove = (e) => {
    const stage =
      e.target.getStage();

    if (!stage) return;

    const point =
      stage.getPointerPosition();

    if (!point) return;

    const rawX =
      (point.x - position.x) /
      scale;

    const rawY =
      (point.y - position.y) /
      scale;

    setMousePosition({
      x: Math.round(rawX),
      y: Math.round(rawY),
    });

    if (!isDrawing) return;

    const x = snapToGrid(rawX);
    const y = snapToGrid(rawY);

    setObjects((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const updated = [...prev];

      const lastIndex =
        updated.length - 1;

      const current = {
        ...updated[lastIndex],
      };

      if (current.type === "line") {
        current.points = [
          current.points[0],
          current.points[1],
          x,
          y,
        ];
      }



      if (current.type === "circle") {
        const dx =
          x - current.x;

        const dy =
          y - current.y;

        current.radius = Math.sqrt(
          dx * dx + dy * dy
        );
      }

      if (current.type === "rectangle") {
        current.width =
          x - current.x;

        current.height =
          y - current.y;
      }

      updated[lastIndex] = current;

      return updated;
    });
  };

  /* =========================
     MOUSE UP
  ========================= */

  const handleMouseUp = () => {
  if (tool === "polyline") {
    return;
  }

  if (!isDrawing) return;

  setIsDrawing(false);

  if (actionStartRef.current) {
    saveHistory(
      actionStartRef.current.objects,
      actionStartRef.current.measurements
    );
  }

  actionStartRef.current = null;
};

/* =========================
   FINISH POLYLINE
========================= */

const finishPolyline = () => {
  if (tool !== "polyline") return;

  if (!isDrawing) return;

  const lastObject =
    objects[objects.length - 1];

  if (
    !lastObject ||
    lastObject.type !== "polyline"
  ) {
    setIsDrawing(false);
    actionStartRef.current = null;
    return;
  }

  if (
    lastObject.points.length < 4
  ) {
    setObjects((prev) =>
      prev.slice(0, -1)
    );

    setIsDrawing(false);
    actionStartRef.current = null;
    return;
  }

  if (actionStartRef.current) {
    saveHistory(
      actionStartRef.current.objects,
      actionStartRef.current.measurements
    );
  }

  setIsDrawing(false);

  actionStartRef.current = null;

  setSelectedIndex(
    objects.length - 1
  );
};

/* =========================
   KEYBOARD
========================= */

const handleKeyDown = (e) => {
  if (e.key === "Enter") {
    finishPolyline();
  }

  if (e.key === "Escape") {
    if (tool === "polyline") {
      setIsDrawing(false);
      setCommandFirstIndex(null);
      actionStartRef.current = null;

      setObjects((prev) => {
        const lastObject =
          prev[prev.length - 1];

        if (
          lastObject &&
          lastObject.type === "polyline" &&
          lastObject.points.length < 4
        ) {
          return prev.slice(0, -1);
        }

        return prev;
      });
    }
  }
};

React.useEffect(() => {
  window.addEventListener(
    "keydown",
    handleKeyDown
  );

  return () => {
    window.removeEventListener(
      "keydown",
      handleKeyDown
    );
  };
}, [tool, isDrawing, objects]);

  /* =========================
     SELECT OBJECT
  ========================= */

  const selectObject = (index) => {
    if (tool === "select") {
      setSelectedIndex(index);
      return;
    }

    if (tool === "move") {
      setSelectedIndex(index);
      return;
    }

    if (tool === "copy") {
      copyObject(index);
      return;
    }

    if (tool === "rotate") {
      rotateObject(index);
      return;
    }

    if (tool === "trim") {
      trimObject(index);
      return;
    }

    if (tool === "extend") {
      extendObject(index);
      return;
    }

    if (tool === "stretch") {
      setSelectedIndex(index);
      return;
    }

    if (tool === "offset") {
      offsetObject(index);
      return;
    }

    if (tool === "mirror") {
      mirrorObject(index);
      return;
    }

    if (tool === "scale") {
      scaleObject(index);
      return;
    }

    if (tool === "explode") {
      explodeObject(index);
      return;
    }


   if (tool === "join") {
  if (commandFirstIndex === null) {
    setCommandFirstIndex(index);
    setSelectedIndex(index);
    return;
  }

  if (commandFirstIndex === index) {
    return;
  }

  joinObject(
    commandFirstIndex,
    index
  );

  setCommandFirstIndex(null);
  return;
}

    /* =========================
       FILLET
    ========================= */

    if (tool === "fillet") {
      if (commandFirstIndex === null) {
        setCommandFirstIndex(index);
        setSelectedIndex(index);
        return;
      }

      if (commandFirstIndex === index) {
        return;
      }

      filletObject(
        commandFirstIndex,
        index
      );

      setCommandFirstIndex(null);
      return;
    }

    /* =========================
       CHAMFER
    ========================= */

    if (tool === "chamfer") {
      if (commandFirstIndex === null) {
        setCommandFirstIndex(index);
        setSelectedIndex(index);
        return;
      }

      if (commandFirstIndex === index) {
        return;
      }

      chamferObject(
        commandFirstIndex,
        index
      );

      setCommandFirstIndex(null);
      return;
    }

    /* =========================
       ARRAY
    ========================= */

    if (tool === "array") {
      arrayObject(index);
      return;
    }
  };

  /* =========================
     COPY
  ========================= */

  const copyObject = (index) => {
    const original =
      objects[index];

    if (!original) return;

    const previousObjects = [
      ...objects,
    ];

    const copied = {
      ...original,
    };

    if (original.type === "circle") {
      copied.x += GRID_SIZE;
      copied.y += GRID_SIZE;
    }

    if (original.type === "rectangle") {
      copied.x += GRID_SIZE;
      copied.y += GRID_SIZE;
    }

    if (original.type === "line") {
      copied.points = [
        original.points[0] +
          GRID_SIZE,
        original.points[1] +
          GRID_SIZE,
        original.points[2] +
          GRID_SIZE,
        original.points[3] +
          GRID_SIZE,
      ];
    }

    if (original.type === "polyline") {
  copied.points = [];

  for (
    let i = 0;
    i < original.points.length;
    i += 2
  ) {
    copied.points.push(
      original.points[i] + GRID_SIZE
    );

    copied.points.push(
      original.points[i + 1] + GRID_SIZE
    );
  }
}

    if (original.type === "arc") {
      copied.x += GRID_SIZE;
      copied.y += GRID_SIZE;
    }

    const newObjects = [
      ...objects,
      copied,
    ];

    setObjects(newObjects);

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  

  /* =========================
     ROTATE
  ========================= */

  const rotateObject = (index) => {
    const previousObjects = [
      ...objects,
    ];

    const updatedObjects =
      objects.map(
        (object, i) => {
          if (i !== index) {
            return object;
          }

          return {
            ...object,
            rotation:
              (object.rotation || 0) +
              15,
          };
        }
      );

    setObjects(updatedObjects);

    setSelectedIndex(index);

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
     TRIM
  ========================= */

  const trimObject = (index) => {
    if (
      index < 0 ||
      index >= objects.length
    ) {
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const previousMeasurements = [
      ...measurements,
    ];

    const newObjects =
      objects.filter(
        (_, i) => i !== index
      );

    setObjects(newObjects);

    saveHistory(
      previousObjects,
      previousMeasurements
    );

    setSelectedIndex(null);
  };

  /* =========================
     EXTEND
  ========================= */

  const extendObject = (index) => {
    const object =
      objects[index];

    if (!object) return;

    if (object.type !== "line") {
      window.alert(
        "Extend currently works with lines."
      );
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const points =
      object.points;

    const x1 = points[0];
    const y1 = points[1];

    const x2 = points[2];
    const y2 = points[3];

    const dx = x2 - x1;
    const dy = y2 - y1;

    const length = Math.sqrt(
      dx * dx + dy * dy
    );

    if (length === 0) return;

    const extension = 100;

    const ux = dx / length;
    const uy = dy / length;

    const newPoints = [
      x1,
      y1,
      x2 + ux * extension,
      y2 + uy * extension,
    ];

    const updatedObjects =
      objects.map(
        (obj, i) => {
          if (i !== index) {
            return obj;
          }

          return {
            ...obj,
            points: newPoints,
          };
        }
      );

    setObjects(updatedObjects);

    setSelectedIndex(index);

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
     OFFSET
  ========================= */

  const offsetObject = (index) => {
    const original =
      objects[index];

    if (!original) return;

    const input = window.prompt(
      "Enter offset distance:",
      "50"
    );

    if (input === null) return;

    const distance = Number(input);

    if (
      !Number.isFinite(distance) ||
      distance <= 0
    ) {
      window.alert(
        "Please enter a valid positive distance."
      );
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    let newObject = null;

    /* LINE OFFSET */

    if (original.type === "line") {
      const [
        x1,
        y1,
        x2,
        y2,
      ] = original.points;

      const dx = x2 - x1;
      const dy = y2 - y1;

      const length = Math.sqrt(
        dx * dx + dy * dy
      );

      if (length === 0) return;

      const nx = -dy / length;
      const ny = dx / length;

      newObject = {
        ...original,

        points: [
          x1 + nx * distance,
          y1 + ny * distance,
          x2 + nx * distance,
          y2 + ny * distance,
        ],
      };
    }

    /* RECTANGLE OFFSET */

    else if (
      original.type === "rectangle"
    ) {
      const x = original.x;
      const y = original.y;

      const width =
        original.width;

      const height =
        original.height;

      newObject = {
        ...original,

        x: x - distance,
        y: y - distance,

        width:
          Math.abs(width) +
          distance * 2,

        height:
          Math.abs(height) +
          distance * 2,
      };
    }

    /* CIRCLE OFFSET */

    else if (
      original.type === "circle"
    ) {
      newObject = {
        ...original,

        radius:
          original.radius +
          distance,
      };
    }

    else {
      window.alert(
        "Offset is currently available for Line, Rectangle and Circle."
      );

      return;
    }

    const newObjects = [
      ...objects,
      newObject,
    ];

    setObjects(newObjects);

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
     FILLET HELPERS
  ========================= */

  const distanceBetween = (
    x1,
    y1,
    x2,
    y2
  ) => {
    return Math.sqrt(
      Math.pow(x2 - x1, 2) +
      Math.pow(y2 - y1, 2)
    );
  };

  const normalizeVector = (
    x,
    y
  ) => {
    const length = Math.hypot(
      x,
      y
    );

    if (length === 0) {
      return {
        x: 0,
        y: 0,
      };
    }

    return {
      x: x / length,
      y: y / length,
    };
  };

  /* =========================
     FILLET
  ========================= */

  const filletObject = (
    firstIndex,
    secondIndex
  ) => {
    const first =
      objects[firstIndex];

    const second =
      objects[secondIndex];

    if (!first || !second) return;

    if (
      first.type !== "line" ||
      second.type !== "line"
    ) {
      window.alert(
        "Fillet currently works only with two lines."
      );

      return;
    }

    const radiusInput =
      window.prompt(
        "Enter fillet radius:",
        "25"
      );

    if (radiusInput === null) return;

    const radius =
      Number(radiusInput);

    if (
      !Number.isFinite(radius) ||
      radius <= 0
    ) {
      window.alert(
        "Invalid radius."
      );

      return;
    }

    const [
      ax1,
      ay1,
      ax2,
      ay2,
    ] = first.points;

    const [
      bx1,
      by1,
      bx2,
      by2,
    ] = second.points;

    const combinations = [
      {
        a: {
          x: ax1,
          y: ay1,
        },
        aEnd: "start",
        b: {
          x: bx1,
          y: by1,
        },
        bEnd: "start",
      },

      {
        a: {
          x: ax1,
          y: ay1,
        },
        aEnd: "start",
        b: {
          x: bx2,
          y: by2,
        },
        bEnd: "end",
      },

      {
        a: {
          x: ax2,
          y: ay2,
        },
        aEnd: "end",
        b: {
          x: bx1,
          y: by1,
        },
        bEnd: "start",
      },

      {
        a: {
          x: ax2,
          y: ay2,
        },
        aEnd: "end",
        b: {
          x: bx2,
          y: by2,
        },
        bEnd: "end",
      },
    ];

    let closest =
      combinations[0];

    let minDistance =
      Infinity;

    combinations.forEach(
      (combination) => {
        const distance =
          distanceBetween(
            combination.a.x,
            combination.a.y,
            combination.b.x,
            combination.b.y
          );

        if (
          distance <
          minDistance
        ) {
          minDistance =
            distance;

          closest =
            combination;
        }
      }
    );

    const firstPoint =
      closest.a;

    const firstOther =
      closest.aEnd === "start"
        ? {
            x: ax2,
            y: ay2,
          }
        : {
            x: ax1,
            y: ay1,
          };

    const secondPoint =
      closest.b;

    const secondOther =
      closest.bEnd === "start"
        ? {
            x: bx2,
            y: by2,
          }
        : {
            x: bx1,
            y: by1,
          };

    const dir1 =
      normalizeVector(
        firstOther.x -
          firstPoint.x,

        firstOther.y -
          firstPoint.y
      );

    const dir2 =
      normalizeVector(
        secondOther.x -
          secondPoint.x,

        secondOther.y -
          secondPoint.y
      );

    const cross =
      dir1.x * dir2.y -
      dir1.y * dir2.x;

    if (
      Math.abs(cross) < 0.01
    ) {
      window.alert(
        "These lines are parallel and cannot be filleted."
      );

      return;
    }

    let dot =
      dir1.x * dir2.x +
      dir1.y * dir2.y;

    dot = Math.max(
      -1,
      Math.min(1, dot)
    );

    const angle =
      Math.acos(dot);

    const tangentDistance =
      radius /
      Math.tan(angle / 2);

    const firstLength =
      distanceBetween(
        firstPoint.x,
        firstPoint.y,
        firstOther.x,
        firstOther.y
      );

    const secondLength =
      distanceBetween(
        secondPoint.x,
        secondPoint.y,
        secondOther.x,
        secondOther.y
      );

    if (
      tangentDistance >=
        firstLength ||
      tangentDistance >=
        secondLength
    ) {
      window.alert(
        "Radius is too large for these lines."
      );

      return;
    }

    const tangent1 = {
      x:
        firstPoint.x +
        dir1.x *
          tangentDistance,

      y:
        firstPoint.y +
        dir1.y *
          tangentDistance,
    };

    const tangent2 = {
      x:
        secondPoint.x +
        dir2.x *
          tangentDistance,

      y:
        secondPoint.y +
        dir2.y *
          tangentDistance,
    };

    const bisector =
      normalizeVector(
        dir1.x + dir2.x,
        dir1.y + dir2.y
      );

    const centerDistance =
      radius /
      Math.sin(angle / 2);

    const center = {
      x:
        firstPoint.x +
        bisector.x *
          centerDistance,

      y:
        firstPoint.y +
        bisector.y *
          centerDistance,
    };

    const startAngle =
      Math.atan2(
        tangent1.y - center.y,
        tangent1.x - center.x
      );

    const endAngle =
      Math.atan2(
        tangent2.y - center.y,
        tangent2.x - center.x
      );

    let arcAngle =
      endAngle - startAngle;

    while (
      arcAngle > Math.PI
    ) {
      arcAngle -=
        Math.PI * 2;
    }

    while (
      arcAngle < -Math.PI
    ) {
      arcAngle +=
        Math.PI * 2;
    }

    const previousObjects = [
      ...objects,
    ];

    const updatedFirst = {
      ...first,

      points:
        closest.aEnd === "start"
          ? [
              tangent1.x,
              tangent1.y,
              ax2,
              ay2,
            ]
          : [
              ax1,
              ay1,
              tangent1.x,
              tangent1.y,
            ],
    };

    const updatedSecond = {
      ...second,

      points:
        closest.bEnd === "start"
          ? [
              tangent2.x,
              tangent2.y,
              bx2,
              by2,
            ]
          : [
              bx1,
              by1,
              tangent2.x,
              tangent2.y,
            ],
    };

    const arc = {
      type: "arc",

      x: center.x,

      y: center.y,

      radius,

      angleStart:
        startAngle,

      angleEnd:
        startAngle +
        arcAngle,

      rotation: 0,

      color:
        first.color ||
        "#ffffff",

      strokeWidth:
        first.strokeWidth ||
        2,

      layerId:
        first.layerId ||
        activeLayerId,
    };

    const newObjects =
      [...objects];

    newObjects[firstIndex] =
      updatedFirst;

    newObjects[secondIndex] =
      updatedSecond;

    newObjects.push(arc);

    setObjects(newObjects);

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
     CHAMFER
  ========================= */

  const chamferObject = (
    firstIndex,
    secondIndex
  ) => {
    const first =
      objects[firstIndex];

    const second =
      objects[secondIndex];

    if (!first || !second) return;

    if (
      first.type !== "line" ||
      second.type !== "line"
    ) {
      window.alert(
        "Chamfer currently works only with two lines."
      );

      return;
    }

    const input =
      window.prompt(
        "Enter chamfer distance:",
        "25"
      );

    if (input === null) return;

    const distance =
      Number(input);

    if (
      !Number.isFinite(
        distance
      ) ||
      distance <= 0
    ) {
      window.alert(
        "Enter a valid positive distance."
      );

      return;
    }

    const [
      ax1,
      ay1,
      ax2,
      ay2,
    ] = first.points;

    const [
      bx1,
      by1,
      bx2,
      by2,
    ] = second.points;

    const endpoints = [
      {
        a: {
          x: ax1,
          y: ay1,
        },
        b: {
          x: bx1,
          y: by1,
        },
        aEnd: "start",
        bEnd: "start",
      },

      {
        a: {
          x: ax1,
          y: ay1,
        },
        b: {
          x: bx2,
          y: by2,
        },
        aEnd: "start",
        bEnd: "end",
      },

      {
        a: {
          x: ax2,
          y: ay2,
        },
        b: {
          x: bx1,
          y: by1,
        },
        aEnd: "end",
        bEnd: "start",
      },

      {
        a: {
          x: ax2,
          y: ay2,
        },
        b: {
          x: bx2,
          y: by2,
        },
        aEnd: "end",
        bEnd: "end",
      },
    ];

    let closest =
      endpoints[0];

    let minDistance =
      Infinity;

    endpoints.forEach(
      (item) => {
        const dx =
          item.a.x -
          item.b.x;

        const dy =
          item.a.y -
          item.b.y;

        const d = Math.sqrt(
          dx * dx +
          dy * dy
        );

        if (
          d < minDistance
        ) {
          minDistance = d;
          closest = item;
        }
      }
    );

    const firstCorner =
      closest.a;

    const secondCorner =
      closest.b;

    const firstOther =
      closest.aEnd === "start"
        ? {
            x: ax2,
            y: ay2,
          }
        : {
            x: ax1,
            y: ay1,
          };

    const secondOther =
      closest.bEnd === "start"
        ? {
            x: bx2,
            y: by2,
          }
        : {
            x: bx1,
            y: by1,
          };

    const dx1 =
      firstOther.x -
      firstCorner.x;

    const dy1 =
      firstOther.y -
      firstCorner.y;

    const len1 =
      Math.sqrt(
        dx1 * dx1 +
        dy1 * dy1
      );

    const dx2 =
      secondOther.x -
      secondCorner.x;

    const dy2 =
      secondOther.y -
      secondCorner.y;

    const len2 =
      Math.sqrt(
        dx2 * dx2 +
        dy2 * dy2
      );

    if (
      len1 <= distance ||
      len2 <= distance
    ) {
      window.alert(
        "Chamfer distance is too large."
      );

      return;
    }

    const p1 = {
      x:
        firstCorner.x +
        (dx1 / len1) *
          distance,

      y:
        firstCorner.y +
        (dy1 / len1) *
          distance,
    };

    const p2 = {
      x:
        secondCorner.x +
        (dx2 / len2) *
          distance,

      y:
        secondCorner.y +
        (dy2 / len2) *
          distance,
    };

    const updatedFirst = {
      ...first,

      points:
        closest.aEnd === "start"
          ? [
              p1.x,
              p1.y,
              ax2,
              ay2,
            ]
          : [
              ax1,
              ay1,
              p1.x,
              p1.y,
            ],
    };

    const updatedSecond = {
      ...second,

      points:
        closest.bEnd === "start"
          ? [
              p2.x,
              p2.y,
              bx2,
              by2,
            ]
          : [
              bx1,
              by1,
              p2.x,
              p2.y,
            ],
    };

    const chamferLine = {
      type: "line",

      points: [
        p1.x,
        p1.y,
        p2.x,
        p2.y,
      ],

      color:
        first.color ||
        "#ffffff",

      strokeWidth:
        first.strokeWidth ||
        2,

      rotation: 0,

      layerId:
        first.layerId ||
        activeLayerId,
    };

    const previousObjects = [
      ...objects,
    ];

    const newObjects = [
      ...objects,
    ];

    newObjects[firstIndex] =
      updatedFirst;

    newObjects[secondIndex] =
      updatedSecond;

    newObjects.push(
      chamferLine
    );

    setObjects(newObjects);

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
     ARRAY
  ========================= */

  const arrayObject = (index) => {
    const original =
      objects[index];

    if (!original) return;

    const rowsInput =
      window.prompt(
        "Number of rows:",
        "2"
      );

    if (rowsInput === null) return;

    const columnsInput =
      window.prompt(
        "Number of columns:",
        "3"
      );

    if (columnsInput === null)
      return;

    const xSpacingInput =
      window.prompt(
        "X spacing:",
        "100"
      );

    if (xSpacingInput === null)
      return;

    const ySpacingInput =
      window.prompt(
        "Y spacing:",
        "100"
      );

    if (ySpacingInput === null)
      return;

    const rows =
      Number(rowsInput);

    const columns =
      Number(columnsInput);

    const xSpacing =
      Number(xSpacingInput);

    const ySpacing =
      Number(ySpacingInput);

    if (
      !Number.isInteger(
        rows
      ) ||
      !Number.isInteger(
        columns
      ) ||
      rows < 1 ||
      columns < 1
    ) {
      window.alert(
        "Rows and columns must be positive numbers."
      );

      return;
    }

    if (
      !Number.isFinite(
        xSpacing
      ) ||
      !Number.isFinite(
        ySpacing
      )
    ) {
      window.alert(
        "Spacing must be valid numbers."
      );

      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const copies = [];

    for (
      let row = 0;
      row < rows;
      row++
    ) {
      for (
        let column = 0;
        column < columns;
        column++
      ) {
        if (
          row === 0 &&
          column === 0
        ) {
          continue;
        }

        const copy = {
          ...original,
        };

        if (
          original.type ===
          "line"
        ) {
          const [
            x1,
            y1,
            x2,
            y2,
          ] = original.points;

          copy.points = [
            x1 +
              column *
                xSpacing,

            y1 +
              row *
                ySpacing,

            x2 +
              column *
                xSpacing,

            y2 +
              row *
                ySpacing,
          ];
        }

        else if (
          original.type ===
          "rectangle"
        ) {
          copy.x =
            original.x +
            column *
              xSpacing;

          copy.y =
            original.y +
            row *
              ySpacing;
        }

        else if (
          original.type ===
          "circle"
        ) {
          copy.x =
            original.x +
            column *
              xSpacing;

          copy.y =
            original.y +
            row *
              ySpacing;
        }

        else if (
          original.type ===
          "arc"
        ) {
          copy.x =
            original.x +
            column *
              xSpacing;

          copy.y =
            original.y +
            row *
              ySpacing;
        }

        else {
          continue;
        }

        copies.push(copy);
      }
    }

    if (
      copies.length === 0
    ) {
      window.alert(
        "This object cannot be arrayed."
      );

      return;
    }

    const newObjects = [
      ...objects,
      ...copies,
    ];

    setObjects(newObjects);

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
   SCALE
========================= */

const scaleObject = (index) => {
  const original = objects[index];

  if (!original) return;

  const input = window.prompt(
    "Enter scale factor:",
    "2"
  );

  if (input === null) return;

  const factor = Number(input);

  if (
    !Number.isFinite(factor) ||
    factor <= 0
  ) {
    window.alert(
      "Please enter a valid positive scale factor."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const copy = {
    ...original,
  };

  /* =========================
     LINE
  ========================= */

  if (original.type === "line") {
    const [
      x1,
      y1,
      x2,
      y2,
    ] = original.points;

    copy.points = [
      x1 * factor,
      y1 * factor,
      x2 * factor,
      y2 * factor,
    ];
  }

  /* =========================
     RECTANGLE
  ========================= */

  else if (
    original.type === "rectangle"
  ) {
    copy.x =
      original.x * factor;

    copy.y =
      original.y * factor;

    copy.width =
      original.width * factor;

    copy.height =
      original.height * factor;
  }

  /* =========================
     CIRCLE
  ========================= */

  else if (
    original.type === "circle"
  ) {
    copy.x =
      original.x * factor;

    copy.y =
      original.y * factor;

    copy.radius =
      original.radius * factor;
  }

  /* =========================
     ARC
  ========================= */

  else if (
    original.type === "arc"
  ) {
    copy.x =
      original.x * factor;

    copy.y =
      original.y * factor;

    copy.radius =
      original.radius * factor;
  }

    /* =========================
     POLYLINE
  ========================= */

  else if (
    original.type === "polyline"
  ) {
    copy.points =
      original.points.map(
        (value) =>
          value * factor
      );
  }

    /* =========================
     POLYLINE
  ========================= */

  else if (
    original.type === "polyline"
  ) {
    const points = [
      ...original.points,
    ];

    const mirroredPoints = [];

    for (
      let i = 0;
      i < points.length;
      i += 2
    ) {
      const x = points[i];
      const y = points[i + 1];

      if (normalizedAxis === "V") {
        mirroredPoints.push(
          -x,
          y
        );
      } else {
        mirroredPoints.push(
          x,
          -y
        );
      }
    }

    copy.points =
      mirroredPoints;
  }


  else {
    window.alert(
      "This object cannot be scaled."
    );
    return;
  }

  const newObjects = [
    ...objects,
    copy,
  ];

  setObjects(newObjects);

  setSelectedIndex(
    newObjects.length - 1
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );
};

  /* =========================
   MIRROR
========================= */

const mirrorObject = (index) => {
  const original = objects[index];

  if (!original) return;

  const axis = window.prompt(
    "Mirror axis? Enter H for Horizontal or V for Vertical:",
    "V"
  );

  if (axis === null) return;

  const normalizedAxis =
    axis.trim().toUpperCase();

  if (
    normalizedAxis !== "H" &&
    normalizedAxis !== "V"
  ) {
    window.alert(
      "Please enter H or V."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const copy = {
    ...original,
  };

  /* =========================
     LINE
  ========================= */

  if (original.type === "line") {
    const [
      x1,
      y1,
      x2,
      y2,
    ] = original.points;

    if (normalizedAxis === "V") {
      copy.points = [
        -x1,
        y1,
        -x2,
        y2,
      ];
    } else {
      copy.points = [
        x1,
        -y1,
        x2,
        -y2,
      ];
    }
  }

  /* =========================
     RECTANGLE
  ========================= */

  else if (
    original.type === "rectangle"
  ) {
    if (normalizedAxis === "V") {
      copy.x =
        -original.x -
        original.width;
    } else {
      copy.y =
        -original.y -
        original.height;
    }
  }

  /* =========================
     CIRCLE
  ========================= */

  else if (
    original.type === "circle"
  ) {
    if (normalizedAxis === "V") {
      copy.x = -original.x;
    } else {
      copy.y = -original.y;
    }
  }

  /* =========================
     ARC
  ========================= */

  else if (
    original.type === "arc"
  ) {
    if (normalizedAxis === "V") {
      copy.x = -original.x;

      copy.angleStart =
        Math.PI -
        original.angleStart;

      copy.angleEnd =
        Math.PI -
        original.angleEnd;
    } else {
      copy.y = -original.y;

      copy.angleStart =
        -original.angleStart;

      copy.angleEnd =
        -original.angleEnd;
    }
  }

    /* =========================
     POLYLINE
  ========================= */

  else if (
    original.type === "polyline"
  ) {
    copy.points =
      original.points.map(
        (value) =>
          value * factor
      );
  }

  else {
    window.alert(
      "This object cannot be mirrored."
    );
    return;
  }

  const newObjects = [
    ...objects,
    copy,
  ];

  setObjects(newObjects);

  setSelectedIndex(
    newObjects.length - 1
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );
};

/* =========================
   EXPLODE
========================= */

const explodeObject = (index) => {
  const original = objects[index];

  if (!original) return;

  const previousObjects = [
    ...objects,
  ];

  /* =========================
     RECTANGLE → 4 LINES
  ========================= */

  if (original.type === "rectangle") {
    const x = original.x;
    const y = original.y;

    const width = original.width;
    const height = original.height;

    const common = {
      rotation: 0,
      color:
        original.color ||
        "#ffffff",
      strokeWidth:
        original.strokeWidth ||
        2,
      layerId:
        original.layerId ||
        activeLayerId,
    };

    const lines = [
      {
        type: "line",
        points: [
          x,
          y,
          x + width,
          y,
        ],
        ...common,
      },

      {
        type: "line",
        points: [
          x + width,
          y,
          x + width,
          y + height,
        ],
        ...common,
      },

      {
        type: "line",
        points: [
          x + width,
          y + height,
          x,
          y + height,
        ],
        ...common,
      },

      {
        type: "line",
        points: [
          x,
          y + height,
          x,
          y,
        ],
        ...common,
      },
    ];

    const newObjects = [
      ...objects.filter(
        (_, i) => i !== index
      ),
      ...lines,
    ];

    setObjects(newObjects);

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

    /* POLYLINE */

  if (original.type === "polyline") {
    const points = original.points;

    const lines = [];

    for (
      let i = 0;
      i < points.length - 2;
      i += 2
    ) {
      lines.push({
        type: "line",
        points: [
          points[i],
          points[i + 1],
          points[i + 2],
          points[i + 3],
        ],
        rotation: 0,
        color:
          original.color ||
          "#ffffff",
        strokeWidth:
          original.strokeWidth ||
          2,
        layerId:
          original.layerId ||
          activeLayerId,
      });
    }

    const newObjects = [
      ...objects.filter(
        (_, i) => i !== index
      ),
      ...lines,
    ];

    setObjects(newObjects);

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

    /* =========================
     POLYLINE → LINES
  ========================= */

  if (
    original.type === "polyline"
  ) {
    const points = original.points;

    if (!points || points.length < 4) {
      window.alert(
        "Polyline has insufficient points."
      );
      return;
    }

    const lines = [];

    for (
      let i = 0;
      i < points.length - 2;
      i += 2
    ) {
      lines.push({
        type: "line",
        points: [
          points[i],
          points[i + 1],
          points[i + 2],
          points[i + 3],
        ],
        rotation: 0,
        color:
          original.color ||
          "#ffffff",
        strokeWidth:
          original.strokeWidth ||
          2,
        layerId:
          original.layerId ||
          activeLayerId,
      });
    }

    const newObjects = [
      ...objects.filter(
        (_, i) => i !== index
      ),
      ...lines,
    ];

    setObjects(newObjects);

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  /* =========================
     ARC
     → LINE-LIKE PIECE
  ========================= */

  if (original.type === "arc") {
    window.alert(
      "Arc explode is not supported yet."
    );
    return;
  }

  /* =========================
     LINE / CIRCLE
  ========================= */

  if (
    original.type === "line" ||
    original.type === "circle"
  ) {
    window.alert(
      "This object cannot be exploded further."
    );
    return;
  }

  window.alert(
    "This object cannot be exploded."
  );
};

  /* =========================
     POLYLINE / LINE JOIN
  ========================= */

  if (
    first.type === "polyline" ||
    second.type === "polyline"
  ) {
    const p1 =
      first.type === "line"
        ? [...first.points]
        : [...first.points];

    const p2 =
      second.type === "line"
        ? [...second.points]
        : [...second.points];

    const reversePoints = (
      points
    ) => {
      const reversed = [];

      for (
        let i =
          points.length - 2;
        i >= 0;
        i -= 2
      ) {
        reversed.push(
          points[i],
          points[i + 1]
        );
      }

      return reversed;
    };

    const distance = (
      x1,
      y1,
      x2,
      y2
    ) => {
      return Math.hypot(
        x2 - x1,
        y2 - y1
      );
    };

    const p1Start = [
      p1[0],
      p1[1],
    ];

    const p1End = [
      p1[p1.length - 2],
      p1[p1.length - 1],
    ];

    const p2Start = [
      p2[0],
      p2[1],
    ];

    const p2End = [
      p2[p2.length - 2],
      p2[p2.length - 1],
    ];

    const tolerance = 10;

    const cases = [
      {
        type: "end-start",
        distance: distance(
          p1End[0],
          p1End[1],
          p2Start[0],
          p2Start[1]
        ),
      },
      {
        type: "end-end",
        distance: distance(
          p1End[0],
          p1End[1],
          p2End[0],
          p2End[1]
        ),
      },
      {
        type: "start-start",
        distance: distance(
          p1Start[0],
          p1Start[1],
          p2Start[0],
          p2Start[1]
        ),
      },
      {
        type: "start-end",
        distance: distance(
          p1Start[0],
          p1Start[1],
          p2End[0],
          p2End[1]
        ),
      },
    ];

    cases.sort(
      (a, b) =>
        a.distance -
        b.distance
    );

    const best = cases[0];

    if (
      best.distance >
      tolerance
    ) {
      window.alert(
        "Objects are not connected."
      );
      return;
    }

    let joinedPoints = null;

    if (
      best.type ===
      "end-start"
    ) {
      joinedPoints = [
        ...p1,
        ...p2.slice(2),
      ];
    }

    if (
      best.type ===
      "end-end"
    ) {
      const reversedP2 =
        reversePoints(p2);

      joinedPoints = [
        ...p1,
        ...reversedP2.slice(2),
      ];
    }

    if (
      best.type ===
      "start-start"
    ) {
      const reversedP1 =
        reversePoints(p1);

      joinedPoints = [
        ...reversedP1,
        ...p2.slice(2),
      ];
    }

    if (
      best.type ===
      "start-end"
    ) {
      const reversedP1 =
        reversePoints(p1);

      const reversedP2 =
        reversePoints(p2);

      joinedPoints = [
        ...reversedP1,
        ...reversedP2.slice(2),
      ];
    }

    if (!joinedPoints) {
      window.alert(
        "Unable to join objects."
      );
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const newObjects =
      objects.filter(
        (_, i) =>
          i !== firstIndex &&
          i !== secondIndex
      );

    newObjects.push({
      type: "polyline",
      points: joinedPoints,
      rotation: 0,
      color:
        first.color ||
        "#ffffff",
      strokeWidth:
        first.strokeWidth ||
        2,
      layerId:
        first.layerId ||
        activeLayerId,
    });

    setObjects(
      newObjects
    );

    setSelectedIndex(
      newObjects.length - 1
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  /* =========================
     MOVE
  ========================= */

  const handleObjectDragStart = (
    index
  ) => {
    if (tool !== "move")
      return;

    const object =
      objects[index];

    if (!object) return;

    actionStartRef.current = {
      objects: [...objects],
      measurements: [
        ...measurements,
      ],
      index,
      object:
        JSON.parse(
          JSON.stringify(
            object
          )
        ),
    };

    setSelectedIndex(index);
  };

  const handleObjectDragEnd = (
    e,
    index
  ) => {
    if (tool !== "move")
      return;

    const object =
      objects[index];

    if (!object) return;

    const startData =
      actionStartRef.current;

    if (
      !startData ||
      startData.index !== index
    ) {
      return;
    }

    const startObject =
      startData.object;

    const node = e.target;

    /* CIRCLE */

    if (
      object.type ===
      "circle"
    ) {
      const newX =
        node.x();

      const newY =
        node.y();

      const updatedObjects =
        objects.map(
          (item, i) => {
            if (i !== index) {
              return item;
            }

            return {
              ...item,
              x: newX,
              y: newY,
            };
          }
        );

      node.position({
        x: 0,
        y: 0,
      });

      setObjects(
        updatedObjects
      );

      saveHistory(
        startData.objects,
        [...measurements]
      );

      actionStartRef.current =
        null;

      return;
    }

    /* RECTANGLE */

    if (
      object.type ===
      "rectangle"
    ) {
      const newX =
        node.x();

      const newY =
        node.y();

      const updatedObjects =
        objects.map(
          (item, i) => {
            if (i !== index) {
              return item;
            }

            return {
              ...item,
              x: newX,
              y: newY,
            };
          }
        );

      node.position({
        x: 0,
        y: 0,
      });

      setObjects(
        updatedObjects
      );

      saveHistory(
        startData.objects,
        [...measurements]
      );

      actionStartRef.current =
        null;

      return;
    }

    /* LINE */

    if (
      object.type ===
      "line"
    ) {
      const dx =
        node.x();

      const dy =
        node.y();

      const updatedObjects =
        objects.map(
          (item, i) => {
            if (i !== index) {
              return item;
            }

            return {
              ...item,

              points: [
                startObject.points[0] +
                  dx,

                startObject.points[1] +
                  dy,

                startObject.points[2] +
                  dx,

                startObject.points[3] +
                  dy,
              ],
            };
          }
        );

      node.position({
        x: 0,
        y: 0,
      });

      setObjects(
        updatedObjects
      );

      saveHistory(
        startData.objects,
        [...measurements]
      );

      actionStartRef.current =
        null;

      return;
    }

    /* ARC */

    if (
      object.type ===
      "arc"
    ) {
      const newX =
        node.x();

      const newY =
        node.y();

      const updatedObjects =
        objects.map(
          (item, i) => {
            if (i !== index) {
              return item;
            }

            return {
              ...item,
              x: newX,
              y: newY,
            };
          }
        );

      node.position({
        x: 0,
        y: 0,
      });

      setObjects(
        updatedObjects
      );

      saveHistory(
        startData.objects,
        [...measurements]
      );

      actionStartRef.current =
        null;

      return;
    }

    actionStartRef.current =
      null;
  };

  /* =========================
     STRETCH
  ========================= */

  const startStretch = (
    index,
    handle
  ) => {
    if (tool !== "stretch")
      return;

    const object =
      objects[index];

    if (!object) return;

    stretchStartRef.current = {
      objects: [...objects],
      measurements: [
        ...measurements,
      ],
      index,
      handle,
      object:
        JSON.parse(
          JSON.stringify(
            object
          )
        ),
    };

    setSelectedIndex(index);
  };

  const updateStretch = (
    index,
    handle,
    e
  ) => {
    if (tool !== "stretch")
      return;

    const startData =
      stretchStartRef.current;

    if (
      !startData ||
      startData.index !== index
    ) {
      return;
    }

    const startObject =
      startData.object;

    const stage =
      e.target.getStage();

    if (!stage) return;

    const pointer =
      stage.getPointerPosition();

    if (!pointer) return;

    const rawX =
      (pointer.x - position.x) /
      scale;

    const rawY =
      (pointer.y - position.y) /
      scale;

    const x =
      snapToGrid(rawX);

    const y =
      snapToGrid(rawY);

    setObjects((prev) => {
      const updated =
        [...prev];

      const object = {
        ...startObject,
      };

      /* LINE */

      if (
        object.type ===
        "line"
      ) {
        if (
          handle ===
          "start"
        ) {
          object.points = [
            x,
            y,
            startObject.points[2],
            startObject.points[3],
          ];
        }

        if (
          handle ===
          "end"
        ) {
          object.points = [
            startObject.points[0],
            startObject.points[1],
            x,
            y,
          ];
        }
      }

      /* RECTANGLE */

      if (
        object.type ===
        "rectangle"
      ) {
        const oldX =
          startObject.x;

        const oldY =
          startObject.y;

        const oldWidth =
          startObject.width;

        const oldHeight =
          startObject.height;

        if (
          handle ===
          "top-left"
        ) {
          const right =
            oldX +
            oldWidth;

          const bottom =
            oldY +
            oldHeight;

          object.x =
            Math.min(
              x,
              right - 10
            );

          object.y =
            Math.min(
              y,
              bottom - 10
            );

          object.width =
            right -
            object.x;

          object.height =
            bottom -
            object.y;
        }

        if (
          handle ===
          "top-right"
        ) {
          const bottom =
            oldY +
            oldHeight;

          object.y =
            Math.min(
              y,
              bottom - 10
            );

          object.width =
            Math.max(
              10,
              x - oldX
            );

          object.height =
            bottom -
            object.y;
        }

        if (
          handle ===
          "bottom-left"
        ) {
          const right =
            oldX +
            oldWidth;

          object.x =
            Math.min(
              x,
              right - 10
            );

          object.width =
            right -
            object.x;

          object.height =
            Math.max(
              10,
              y - oldY
            );
        }

        if (
          handle ===
          "bottom-right"
        ) {
          object.width =
            Math.max(
              10,
              x - oldX
            );

          object.height =
            Math.max(
              10,
              y - oldY
            );
        }
      }

      /* CIRCLE */

      if (
        object.type ===
        "circle"
      ) {
        const dx =
          x - startObject.x;

        const dy =
          y - startObject.y;

        object.radius =
          Math.max(
            5,
            Math.sqrt(
              dx * dx +
              dy * dy
            )
          );
      }

      updated[index] =
        object;

      return updated;
    });
  };

  const endStretch = () => {
    if (tool !== "stretch")
      return;

    const startData =
      stretchStartRef.current;

    if (!startData)
      return;

    saveHistory(
      startData.objects,
      startData.measurements
    );

    stretchStartRef.current =
      null;
  };

  /* =========================
     LAYERS
  ========================= */

  const addLayer = () => {
    const newId =
      `layer-${Date.now()}`;

    const newLayer = {
      id: newId,
      name:
        `Layer ${layers.length}`,
      visible: true,
    };

    setLayers((prev) => [
      ...prev,
      newLayer,
    ]);

    setActiveLayerId(
      newId
    );
  };

  const renameLayer = (
    layerId
  ) => {
    const layer =
      layers.find(
        (item) =>
          item.id ===
          layerId
      );

    if (!layer) return;

    const newName =
      window.prompt(
        "Enter layer name:",
        layer.name
      );

    if (
      !newName ||
      !newName.trim()
    ) {
      return;
    }

    setLayers((prev) =>
      prev.map((item) =>
        item.id === layerId
          ? {
              ...item,
              name:
                newName.trim(),
            }
          : item
      )
    );
  };

  const toggleLayerVisibility = (
    layerId
  ) => {
    setLayers((prev) =>
      prev.map((item) =>
        item.id === layerId
          ? {
              ...item,
              visible:
                !item.visible,
            }
          : item
      )
    );

    if (
      selectedIndex !== null
    ) {
      const selectedObject =
        objects[
          selectedIndex
        ];

      if (
        selectedObject &&
        (
          selectedObject.layerId ||
          "layer-0"
        ) === layerId
      ) {
        setSelectedIndex(
          null
        );
      }
    }
  };

  const deleteLayer = (
    layerId
  ) => {
    if (
      layers.length === 1
    ) {
      window.alert(
        "At least one layer is required."
      );

      return;
    }

    if (
      layerId === "layer-0"
    ) {
      window.alert(
        "Layer 0 cannot be deleted."
      );

      return;
    }

    const hasObjects =
      objects.some(
        (object) =>
          (
            object.layerId ||
            "layer-0"
          ) === layerId
      );

    if (hasObjects) {
      window.alert(
        "This layer contains objects. Move or delete them first."
      );

      return;
    }

    const remainingLayers =
      layers.filter(
        (item) =>
          item.id !==
          layerId
      );

    setLayers(
      remainingLayers
    );

    if (
      activeLayerId ===
      layerId
    ) {
      setActiveLayerId(
        remainingLayers[0].id
      );
    }
  };

  /* =========================
     MOVE SELECTED TO LAYER
  ========================= */

  const moveSelectedToLayer = (
    layerId
  ) => {
    if (
      selectedIndex === null
    ) {
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const updatedObjects =
      objects.map(
        (object, index) =>
          index ===
          selectedIndex
            ? {
                ...object,
                layerId,
              }
            : object
      );

    setObjects(
      updatedObjects
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
     UPDATE PROPERTIES
  ========================= */

  const updateSelectedObject = (
    property,
    value
  ) => {
    if (
      selectedIndex === null
    ) {
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    let finalValue = value;

    if (
      property ===
        "strokeWidth" ||
      property ===
        "rotation" ||
      property ===
        "radius" ||
      property ===
        "width" ||
      property ===
        "height" ||
      property === "x" ||
      property === "y"
    ) {
      finalValue =
        Number(value);
    }

    const updatedObjects =
      objects.map(
        (object, index) => {
          if (
            index !==
            selectedIndex
          ) {
            return object;
          }

          return {
            ...object,
            [property]:
              finalValue,
          };
        }
      );

    setObjects(
      updatedObjects
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
     DELETE SELECTED
  ========================= */

  const deleteSelected = () => {
    if (
      selectedIndex === null
    ) {
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const previousMeasurements = [
      ...measurements,
    ];

    const newObjects =
      objects.filter(
        (_, index) =>
          index !==
          selectedIndex
      );

    setObjects(
      newObjects
    );

    saveHistory(
      previousObjects,
      previousMeasurements
    );

    setSelectedIndex(
      null
    );
  };

  /* =========================
     NEW / CLEAR
  ========================= */

  const clearDrawing = () => {
    if (
      objects.length === 0 &&
      measurements.length === 0
    ) {
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const previousMeasurements = [
      ...measurements,
    ];

    saveHistory(
      previousObjects,
      previousMeasurements
    );

    setObjects([]);

    setMeasurements([]);

    setMeasureStart(null);

    setSelectedIndex(null);

    setCommandFirstIndex(
      null
    );

    setIsDrawing(false);

    setScale(1);

    setPosition({
      x: 0,
      y: 0,
    });

    setMousePosition({
      x: 0,
      y: 0,
    });

    setTool("select");
  };

  /* =========================
     ZOOM
  ========================= */

  const handleWheel = (e) => {
    e.evt.preventDefault();

    const stage =
      stageRef.current;

    if (!stage) return;

    const oldScale =
      scale;

    const pointer =
      stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x:
        (pointer.x -
          position.x) /
        oldScale,

      y:
        (pointer.y -
          position.y) /
        oldScale,
    };

    const zoomAmount =
      1.1;

    const newScale =
      e.evt.deltaY > 0
        ? oldScale /
          zoomAmount
        : oldScale *
          zoomAmount;

    const limitedScale =
      Math.max(
        0.2,
        Math.min(
          newScale,
          5
        )
      );

    setScale(
      limitedScale
    );

    setPosition({
      x:
        pointer.x -
        mousePointTo.x *
          limitedScale,

      y:
        pointer.y -
        mousePointTo.y *
          limitedScale,
    });
  };

  /* =========================
     PAN
  ========================= */

  const handleDragEnd = (
    e
  ) => {
    setPosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  /* =========================
     CHANGE TOOL
  ========================= */

  const changeTool = (
    newTool
  ) => {
    setTool(newTool);

    setSelectedIndex(null);

    setCommandFirstIndex(
      null
    );

    stretchStartRef.current =
      null;

    if (
      newTool !==
      "measure"
    ) {
      setMeasureStart(null);
    }
  };

  /* =========================
     SELECTED OBJECT
  ========================= */

  const selectedObject =
    selectedIndex !== null
      ? objects[
          selectedIndex
        ]
      : null;

  return (
    <div className="app">

      {/* TOP BAR */}

      <header className="topbar">

        <div className="logo">
          MyCAD
        </div>

        <button
          onClick={
            clearDrawing
          }
        >
          New
        </button>

        <button>
          Open
        </button>

        <button>
          Save
        </button>

        <button
          onClick={undo}
          disabled={
            past.length === 0
          }
        >
          ↶ Undo
        </button>

        <button
          onClick={redo}
          disabled={
            future.length === 0
          }
        >
          ↷ Redo
        </button>

        <div className="spacer"></div>

        <button
          onClick={
            deleteSelected
          }
        >
          Delete
        </button>

      </header>

      {/* MAIN */}

      <div className="main">

        {/* TOOLBAR */}

        <aside className="toolbar">

          <button
            className={
              tool ===
              "select"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "select"
              )
            }
            title="Select"
          >
            ↖
          </button>

          <button
            className={
              tool === "line"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "line"
              )
            }
            title="Line"
          >
            ╱
          </button>

          <button
            className={
              tool === "polyline"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool("polyline")
            }
            title="Polyline"
          >
            Polyline
          </button>

          <button
            className={
              tool ===
              "rectangle"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "rectangle"
              )
            }
            title="Rectangle"
          >
            □
          </button>

          <button
            className={
              tool === "circle"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "circle"
              )
            }
            title="Circle"
          >
            ○
          </button>

          <button
            className={
              tool ===
              "measure"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "measure"
              )
            }
            title="Measure"
          >
            📏
          </button>

          <button
            className={
              tool === "move"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "move"
              )
            }
            title="Move"
          >
            ✥
          </button>

          <button
            className={
              tool === "copy"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "copy"
              )
            }
            title="Copy"
          >
            📋
          </button>

          <button
            className={
              tool ===
              "rotate"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "rotate"
              )
            }
            title="Rotate"
          >
            🔄
          </button>

          <button
            className={
              tool === "trim"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "trim"
              )
            }
            title="Trim"
          >
            ✂
          </button>

          <button
            className={
              tool ===
              "extend"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "extend"
              )
            }
            title="Extend"
          >
            ↔
          </button>

          <button
            className={
              tool ===
              "stretch"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "stretch"
              )
            }
            title="Stretch"
          >
            Stretch
          </button>

          <button
            className={
              tool ===
              "offset"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "offset"
              )
            }
            title="Offset"
          >
            Offset
          </button>

          <button
            className={
              tool ===
              "fillet"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "fillet"
              )
            }
            title="Fillet"
          >
            Fillet
          </button>

          <button
            className={
              tool ===
              "chamfer"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "chamfer"
              )
            }
            title="Chamfer"
          >
            Chamfer
          </button>

          <button
            className={
              tool ===
              "array"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "array"
              )
            }
            title="Array"
          >
            Array
          </button>

          <button
            className={
              tool === "mirror"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool("mirror")
            }
            title="Mirror"
          >
            Mirror
          </button>
          <button
            className={
              tool === "scale"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool("scale")
            }
            title="Scale"
         >
            Scale
         </button>

         <button
           className={
             tool === "explode"
               ? "active"
               : ""
           }
           onClick={() =>
             changeTool("explode")
           }
           title="Explode"
         >
           Explode
         </button>

         <button
           className={
             tool === "join"
               ? "active"
               : ""
           }
           onClick={() =>
             changeTool("join")
           }
           title="Join"
         >
           Join
         </button>

        </aside>

        {/* LAYERS PANEL */}

        <aside
          style={{
            width: "240px",
            minWidth: "240px",
            background: "#171717",
            borderRight:
              "1px solid #333",
            padding: "10px",
            overflowY: "auto",
            color: "#fff",
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                "10px",
            }}
          >
            <strong>
              Layers
            </strong>

            <button
              onClick={
                addLayer
              }
              title="Add Layer"
              style={{
                padding:
                  "4px 8px",
                cursor:
                  "pointer",
              }}
            >
              +
            </button>
          </div>

          {layers.map(
            (layer) => (
              <div
                key={
                  layer.id
                }
                onClick={() =>
                  setActiveLayerId(
                    layer.id
                  )
                }
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "5px",
                  padding:
                    "6px",
                  marginBottom:
                    "4px",
                  borderRadius:
                    "4px",
                  background:
                    activeLayerId ===
                    layer.id
                      ? "#2d4058"
                      : "transparent",
                  cursor:
                    "pointer",
                }}
              >

                <button
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();

                    toggleLayerVisibility(
                      layer.id
                    );
                  }}
                  title={
                    layer.visible
                      ? "Hide Layer"
                      : "Show Layer"
                  }
                  style={{
                    background:
                      "transparent",
                    border:
                      "none",
                    color:
                      "#fff",
                    cursor:
                      "pointer",
                    padding:
                      0,
                  }}
                >
                  {layer.visible
                    ? "👁"
                    : "○"}
                </button>

                <span
                  style={{
                    flex: 1,
                    fontSize:
                      "13px",
                  }}
                >
                  {
                    layer.name
                  }
                </span>

                <button
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();

                    renameLayer(
                      layer.id
                    );
                  }}
                  title="Rename Layer"
                  style={{
                    background:
                      "transparent",
                    border:
                      "none",
                    color:
                      "#aaa",
                    cursor:
                      "pointer",
                    padding:
                      0,
                  }}
                >
                  ✎
                </button>

                <button
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();

                    deleteLayer(
                      layer.id
                    );
                  }}
                  title="Delete Layer"
                  style={{
                    background:
                      "transparent",
                    border:
                      "none",
                    color:
                      "#f66",
                    cursor:
                      "pointer",
                    padding:
                      0,
                  }}
                >
                  ×
                </button>

              </div>
            )
          )}

          <div
            style={{
              marginTop:
                "12px",
              paddingTop:
                "10px",
              borderTop:
                "1px solid #333",
              fontSize:
                "12px",
              color:
                "#aaa",
            }}
          >
            Active:{" "}
            {
              layers.find(
                (layer) =>
                  layer.id ===
                  activeLayerId
              )?.name
            }
          </div>

          {/* OBJECT PROPERTIES */}

          {selectedObject && (
            <div
              style={{
                marginTop:
                  "15px",
                paddingTop:
                  "12px",
                borderTop:
                  "1px solid #333",
              }}
            >

              <strong
                style={{
                  fontSize:
                    "14px",
                }}
              >
                Object Properties
              </strong>

              <div
                style={{
                  marginTop:
                    "12px",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "12px",
                    marginBottom:
                      "4px",
                    color:
                      "#aaa",
                  }}
                >
                  Type
                </label>

                <input
                  value={
                    selectedObject.type
                  }
                  disabled
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "6px",
                    background:
                      "#222",
                    color:
                      "#aaa",
                    border:
                      "1px solid #444",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop:
                    "10px",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "12px",
                    marginBottom:
                      "4px",
                    color:
                      "#aaa",
                  }}
                >
                  Layer
                </label>

                <select
                  value={
                    selectedObject.layerId ||
                    "layer-0"
                  }
                  onChange={(
                    event
                  ) =>
                    moveSelectedToLayer(
                      event.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "6px",
                    background:
                      "#222",
                    color:
                      "#fff",
                    border:
                      "1px solid #444",
                  }}
                >
                  {layers.map(
                    (layer) => (
                      <option
                        key={
                          layer.id
                        }
                        value={
                          layer.id
                        }
                      >
                        {
                          layer.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div
                style={{
                  marginTop:
                    "10px",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "12px",
                    marginBottom:
                      "4px",
                    color:
                      "#aaa",
                  }}
                >
                  Color
                </label>

                <input
                  type="color"
                  value={
                    selectedObject.color ||
                    "#ffffff"
                  }
                  onChange={(
                    event
                  ) =>
                    updateSelectedObject(
                      "color",
                      event.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    height:
                      "35px",
                    background:
                      "#222",
                    border:
                      "1px solid #444",
                    cursor:
                      "pointer",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop:
                    "10px",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "12px",
                    marginBottom:
                      "4px",
                    color:
                      "#aaa",
                  }}
                >
                  Line Width
                </label>

                <input
                  type="number"
                  min="1"
                  max="20"
                  value={
                    selectedObject.strokeWidth ||
                    2
                  }
                  onChange={(
                    event
                  ) =>
                    updateSelectedObject(
                      "strokeWidth",
                      event.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "6px",
                    background:
                      "#222",
                    color:
                      "#fff",
                    border:
                      "1px solid #444",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop:
                    "10px",
                }}
              >
                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "12px",
                    marginBottom:
                      "4px",
                    color:
                      "#aaa",
                  }}
                >
                  Rotation
                </label>

                <input
                  type="number"
                  value={
                    selectedObject.rotation ||
                    0
                  }
                  onChange={(
                    event
                  ) =>
                    updateSelectedObject(
                      "rotation",
                      event.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "6px",
                    background:
                      "#222",
                    color:
                      "#fff",
                    border:
                      "1px solid #444",
                  }}
                />
              </div>

              {selectedObject.type !==
                "line" && (
                <div
                  style={{
                    marginTop:
                      "10px",
                  }}
                >
                  <label
                    style={{
                      display:
                        "block",
                      fontSize:
                        "12px",
                      marginBottom:
                        "4px",
                      color:
                        "#aaa",
                    }}
                  >
                    X
                  </label>

                  <input
                    type="number"
                    value={
                      selectedObject.x ||
                      0
                    }
                    onChange={(
                      event
                    ) =>
                      updateSelectedObject(
                        "x",
                        event.target
                          .value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      padding:
                        "6px",
                      background:
                        "#222",
                      color:
                        "#fff",
                      border:
                        "1px solid #444",
                    }}
                  />
                </div>
              )}

              {selectedObject.type !==
                "line" && (
                <div
                  style={{
                    marginTop:
                      "10px",
                  }}
                >
                  <label
                    style={{
                      display:
                        "block",
                      fontSize:
                        "12px",
                      marginBottom:
                        "4px",
                      color:
                        "#aaa",
                    }}
                  >
                    Y
                  </label>

                  <input
                    type="number"
                    value={
                      selectedObject.y ||
                      0
                    }
                    onChange={(
                      event
                    ) =>
                      updateSelectedObject(
                        "y",
                        event.target
                          .value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      padding:
                        "6px",
                      background:
                        "#222",
                      color:
                        "#fff",
                      border:
                        "1px solid #444",
                    }}
                  />
                </div>
              )}

              {selectedObject.type ===
                "circle" && (
                <div
                  style={{
                    marginTop:
                      "10px",
                  }}
                >
                  <label
                    style={{
                      display:
                        "block",
                      fontSize:
                        "12px",
                      marginBottom:
                        "4px",
                      color:
                        "#aaa",
                    }}
                  >
                    Radius
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      selectedObject.radius ||
                      0
                    }
                    onChange={(
                      event
                    ) =>
                      updateSelectedObject(
                        "radius",
                        event.target
                          .value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      padding:
                        "6px",
                      background:
                        "#222",
                      color:
                        "#fff",
                      border:
                        "1px solid #444",
                    }}
                  />
                </div>
              )}

              {selectedObject.type ===
                "rectangle" && (
                <>
                  <div
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    <label
                      style={{
                        display:
                          "block",
                        fontSize:
                          "12px",
                        marginBottom:
                          "4px",
                        color:
                          "#aaa",
                      }}
                    >
                      Width
                    </label>

                    <input
                      type="number"
                      value={
                        selectedObject.width ||
                        0
                      }
                      onChange={(
                        event
                      ) =>
                        updateSelectedObject(
                          "width",
                          event.target
                            .value
                        )
                      }
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "6px",
                        background:
                          "#222",
                        color:
                          "#fff",
                        border:
                          "1px solid #444",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    <label
                      style={{
                        display:
                          "block",
                        fontSize:
                          "12px",
                        marginBottom:
                          "4px",
                        color:
                          "#aaa",
                      }}
                    >
                      Height
                    </label>

                    <input
                      type="number"
                      value={
                        selectedObject.height ||
                        0
                      }
                      onChange={(
                        event
                      ) =>
                        updateSelectedObject(
                          "height",
                          event.target
                            .value
                        )
                      }
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "6px",
                        background:
                          "#222",
                        color:
                          "#fff",
                        border:
                          "1px solid #444",
                      }}
                    />
                  </div>
                </>
              )}

            </div>
          )}

        </aside>

        {/* WORKSPACE */}

        <main className="workspace">

          <div className="grid"></div>

          <Stage
            ref={stageRef}
            width={
              window.innerWidth -
              298
            }
            height={
              window.innerHeight -
              87
            }
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            draggable={
              tool === "select"
            }
            onDragEnd={
              handleDragEnd
            }
            onMouseDown={
              handleMouseDown
            }
            onMouseMove={
              handleMouseMove
            }
            onMouseUp={
              handleMouseUp
            }
            onWheel={
              handleWheel
            }
          >

            <Layer>

              {/* MEASURE START */}

              {tool === "measure" &&
                measureStart && (
                  <Circle
                    x={
                      measureStart.x
                    }
                    y={
                      measureStart.y
                    }
                    radius={6}
                    fill="yellow"
                  />
                )}

              {/* MEASUREMENTS */}

              {measurements.map(
                (
                  measurement,
                  index
                ) => {
                  const midX =
                    (measurement.x1 +
                      measurement.x2) /
                    2;

                  const midY =
                    (measurement.y1 +
                      measurement.y2) /
                    2;

                  return (
                    <React.Fragment
                      key={
                        `measurement-${index}`
                      }
                    >
                      <Line
                        points={[
                          measurement.x1,
                          measurement.y1,
                          measurement.x2,
                          measurement.y2,
                        ]}
                        stroke="cyan"
                        strokeWidth={2}
                        dash={[
                          8,
                          5,
                        ]}
                      />

                      <Circle
                        x={
                          measurement.x1
                        }
                        y={
                          measurement.y1
                        }
                        radius={4}
                        fill="cyan"
                      />

                      <Circle
                        x={
                          measurement.x2
                        }
                        y={
                          measurement.y2
                        }
                        radius={4}
                        fill="cyan"
                      />

                      <Text
                        x={midX}
                        y={
                          midY -
                          25
                        }
                        text={`${measurement.distance} units`}
                        fontSize={
                          16
                        }
                        fill="cyan"
                      />
                    </React.Fragment>
                  );
                }
              )}

              {/* OBJECTS */}

              {objects.map(
                (
                  object,
                  index
                ) => {
                  const objectLayer =
                    layers.find(
                      (layer) =>
                        layer.id ===
                        (
                          object.layerId ||
                          "layer-0"
                        )
                    );

                  if (
                    objectLayer &&
                    !objectLayer.visible
                  ) {
                    return null;
                  }

                  const selected =
                    selectedIndex ===
                    index;

                  const commonProps = {
                    key: index,

                    draggable:
                      tool === "move",

                    onClick: () =>
                      selectObject(
                        index
                      ),

                    onTap: () =>
                      selectObject(
                        index
                      ),

                    onDragStart: () =>
                      handleObjectDragStart(
                        index
                      ),

                    onDragEnd: (
                      e
                    ) =>
                      handleObjectDragEnd(
                        e,
                        index
                      ),
                  };

                  /* LINE */

                  if (
                    object.type ===
                    "line"
                  ) {
                    return (
                      <Line
                        {...commonProps}
                        points={
                          object.points
                        }
                        stroke={
                          selected
                            ? "yellow"
                            : object.color ||
                              "#ffffff"
                        }
                        strokeWidth={
                          selected
                            ? 4
                            : object.strokeWidth ||
                              2
                        }
                        hitStrokeWidth={
                          15
                        }
                        rotation={
                          object.rotation ||
                          0
                        }
                      />
                    );
                  }

                  /* CIRCLE */

                  if (
                    object.type ===
                    "circle"
                  ) {
                    return (
                      <Circle
                        {...commonProps}
                        x={
                          object.x
                        }
                        y={
                          object.y
                        }
                        radius={
                          object.radius
                        }
                        stroke={
                          selected
                            ? "yellow"
                            : object.color ||
                              "#ffffff"
                        }
                        strokeWidth={
                          selected
                            ? 4
                            : object.strokeWidth ||
                              2
                        }
                        rotation={
                          object.rotation ||
                          0
                        }
                      />
                    );
                  }

                                    /* RECTANGLE */

                  if (
                    object.type ===
                    "rectangle"
                  ) {
                    return (
                      <Rect
                        {...commonProps}
                        x={object.x}
                        y={object.y}
                        width={object.width}
                        height={object.height}
                        stroke={
                          selected
                            ? "yellow"
                            : object.color ||
                              "#ffffff"
                        }
                        strokeWidth={
                          selected
                            ? 4
                            : object.strokeWidth ||
                              2
                        }
                        rotation={
                          object.rotation ||
                          0
                        }
                      />
                    );
                  }

                                  /* RECTANGLE */

                  if (
                    object.type ===
                    "rectangle"
                  ) {
                    return (
                      <Rect
                        {...commonProps}
                        x={object.x}
                        y={object.y}
                        width={object.width}
                        height={object.height}
                        stroke={
                          selected
                            ? "yellow"
                            : object.color ||
                              "#ffffff"
                        }
                        strokeWidth={
                          selected
                            ? 4
                            : object.strokeWidth ||
                              2
                        }
                        rotation={
                          object.rotation ||
                          0
                        }
                      />
                    );
                  }

                 /* POLYLINE */

if (
  object.type ===
  "polyline"
) {
  return (
    <Line
      {...commonProps}
      points={object.points}
      rotation={
        object.rotation ||
        0
      }
      stroke={
        selected
          ? "yellow"
          : object.color ||
            "#ffffff"
      }
      strokeWidth={
        selected
          ? 4
          : object.strokeWidth ||
            2
      }
      hitStrokeWidth={15}
    />
  );
}

                  /* ARC */

                  if (
                    object.type ===
                    "arc"
                  ) {
                    const arcAngle =
                      (
                        object.angleEnd -
                        object.angleStart
                      ) *
                      (180 /
                        Math.PI);

                    return (
                      <Arc
                        {...commonProps}
                        x={object.x}
                        y={object.y}
                        innerRadius={
                          object.radius
                        }
                        outerRadius={
                          object.radius
                        }
                        angle={arcAngle}
                        rotation={
                          object.angleStart *
                          (180 /
                            Math.PI)
                        }
                        stroke={
                          selected
                            ? "yellow"
                            : object.color ||
                              "#ffffff"
                        }
                        strokeWidth={
                          selected
                            ? 4
                            : object.strokeWidth ||
                              2
                        }
                      />
                    );
                  }

                  return null;
                }
              )}

              {/* =========================
                  STRETCH HANDLES
              ========================= */}

              {tool === "stretch" &&
                selectedObject && (
                  <>

                    {/* LINE HANDLES */}

                    {selectedObject.type ===
                      "line" && (
                      <>
                        <Circle
                          x={
                            selectedObject
                              .points[0]
                          }
                          y={
                            selectedObject
                              .points[1]
                          }
                          radius={8}
                          fill="yellow"
                          stroke="black"
                          strokeWidth={2}
                          draggable
                          onMouseDown={(
                            e
                          ) => {
                            e.cancelBubble =
                              true;
                          }}
                          onTouchStart={(
                            e
                          ) => {
                            e.cancelBubble =
                              true;
                          }}
                          onDragStart={() =>
                            startStretch(
                              selectedIndex,
                              "start"
                            )
                          }
                          onDragMove={(
                            e
                          ) =>
                            updateStretch(
                              selectedIndex,
                              "start",
                              e
                            )
                          }
                          onDragEnd={
                            endStretch
                          }
                        />

                        <Circle
                          x={
                            selectedObject
                              .points[2]
                          }
                          y={
                            selectedObject
                              .points[3]
                          }
                          radius={8}
                          fill="yellow"
                          stroke="black"
                          strokeWidth={2}
                          draggable
                          onMouseDown={(
                            e
                          ) => {
                            e.cancelBubble =
                              true;
                          }}
                          onTouchStart={(
                            e
                          ) => {
                            e.cancelBubble =
                              true;
                          }}
                          onDragStart={() =>
                            startStretch(
                              selectedIndex,
                              "end"
                            )
                          }
                          onDragMove={(
                            e
                          ) =>
                            updateStretch(
                              selectedIndex,
                              "end",
                              e
                            )
                          }
                          onDragEnd={
                            endStretch
                          }
                        />
                      </>
                    )}

                    {/* RECTANGLE HANDLES */}

                    {selectedObject.type ===
                      "rectangle" && (
                      <>
                        <Circle
                          x={
                            selectedObject.x
                          }
                          y={
                            selectedObject.y
                          }
                          radius={8}
                          fill="yellow"
                          stroke="black"
                          strokeWidth={2}
                          draggable
                          onMouseDown={(
                            e
                          ) => {
                            e.cancelBubble =
                              true;
                          }}
                          onDragStart={() =>
                            startStretch(
                              selectedIndex,
                              "top-left"
                            )
                          }
                          onDragMove={(
                            e
                          ) =>
                            updateStretch(
                              selectedIndex,
                              "top-left",
                              e
                            )
                          }
                          onDragEnd={
                            endStretch
                          }
                        />

                        <Circle
                          x={
                            selectedObject.x +
                            selectedObject.width
                          }
                          y={
                            selectedObject.y
                          }
                          radius={8}
                          fill="yellow"
                          stroke="black"
                          strokeWidth={2}
                          draggable
                          onMouseDown={(
                            e
                          ) => {
                            e.cancelBubble =
                              true;
                          }}
                          onDragStart={() =>
                            startStretch(
                              selectedIndex,
                              "top-right"
                            )
                          }
                          onDragMove={(
                            e
                          ) =>
                            updateStretch(
                              selectedIndex,
                              "top-right",
                              e
                            )
                          }
                          onDragEnd={
                            endStretch
                          }
                        />

                        <Circle
                          x={
                            selectedObject.x
                          }
                          y={
                            selectedObject.y +
                            selectedObject.height
                          }
                          radius={8}
                          fill="yellow"
                          stroke="black"
                          strokeWidth={2}
                          draggable
                          onMouseDown={(
                            e
                          ) => {
                            e.cancelBubble =
                              true;
                          }}
                          onDragStart={() =>
                            startStretch(
                              selectedIndex,
                              "bottom-left"
                            )
                          }
                          onDragMove={(
                            e
                          ) =>
                            updateStretch(
                              selectedIndex,
                              "bottom-left",
                              e
                            )
                          }
                          onDragEnd={
                            endStretch
                          }
                        />

                        <Circle
                          x={
                            selectedObject.x +
                            selectedObject.width
                          }
                          y={
                            selectedObject.y +
                            selectedObject.height
                          }
                          radius={8}
                          fill="yellow"
                          stroke="black"
                          strokeWidth={2}
                          draggable
                          onMouseDown={(
                            e
                          ) => {
                            e.cancelBubble =
                              true;
                          }}
                          onDragStart={() =>
                            startStretch(
                              selectedIndex,
                              "bottom-right"
                            )
                          }
                          onDragMove={(
                            e
                          ) =>
                            updateStretch(
                              selectedIndex,
                              "bottom-right",
                              e
                            )
                          }
                          onDragEnd={
                            endStretch
                          }
                        />
                      </>
                    )}

                    {/* CIRCLE HANDLE */}

                    {selectedObject.type ===
                      "circle" && (
                      <Circle
                        x={
                          selectedObject.x +
                          selectedObject.radius
                        }
                        y={
                          selectedObject.y
                        }
                        radius={8}
                        fill="yellow"
                        stroke="black"
                        strokeWidth={2}
                        draggable
                        onMouseDown={(
                          e
                        ) => {
                          e.cancelBubble =
                            true;
                        }}
                        onDragStart={() =>
                          startStretch(
                            selectedIndex,
                            "radius"
                          )
                        }
                        onDragMove={(
                          e
                        ) =>
                          updateStretch(
                            selectedIndex,
                            "radius",
                            e
                          )
                        }
                        onDragEnd={
                          endStretch
                        }
                      />
                    )}

                                        {/* POLYLINE HANDLES */}

                    {selectedObject.type ===
                      "polyline" && (
                      <>
                        {selectedObject.points.map(
                          (value, i) => {
                            if (i % 2 !== 0)
                              return null;

                            const pointIndex =
                              i / 2;

                            return (
                              <Circle
                                key={
                                  pointIndex
                                }
                                x={
                                  selectedObject
                                    .points[i]
                                }
                                y={
                                  selectedObject
                                    .points[i + 1]
                                }
                                radius={7}
                                fill="yellow"
                                stroke="black"
                                strokeWidth={2}
                                draggable
                                onMouseDown={(
                                  e
                                ) => {
                                  e.cancelBubble =
                                    true;
                                }}
                                onTouchStart={(
                                  e
                                ) => {
                                  e.cancelBubble =
                                    true;
                                }}
                                onDragStart={() =>
                                  startStretch(
                                    selectedIndex,
                                    `point-${pointIndex}`
                                  )
                                }
                                onDragMove={(
                                  e
                                ) =>
                                  updateStretch(
                                    selectedIndex,
                                    `point-${pointIndex}`,
                                    e
                                  )
                                }
                                onDragEnd={
                                  endStretch
                                }
                              />
                            );
                          }
                        )}
                      </>
                    )}

                  </>
                )}
                  </Layer>

          </Stage>

        </main>

      </div>

      {/* STATUS BAR */}

      <footer className="statusbar">

        <span>
          Tool: {tool}
        </span>

        <span>
          Objects:{" "}
          {objects.length}
        </span>

        <span>
          Layer:{" "}
          {
            layers.find(
              (layer) =>
                layer.id ===
                activeLayerId
            )?.name
          }
        </span>

        <span>
          Zoom:{" "}
          {Math.round(
            scale * 100
          )}
          %
        </span>

        <span>
          X:{" "}
          {mousePosition.x}
        </span>

        <span>
          Y:{" "}
          {mousePosition.y}
        </span>

        <span>
          Mouse Wheel: Zoom
        </span>

        <span>
          Select + Drag: Pan
        </span>

      </footer>

    </div>
  );
}

export default App;
              