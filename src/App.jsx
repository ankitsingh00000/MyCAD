
import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import {
  Stage,
  Layer,
  Group,
  Line,
  Circle,
  Rect,
  Text,
  Arc,
  Ellipse,
} from "react-konva";
import "./App.css";

function App() {
  // === VIDEO CLONE: App phases ===
  const [appPhase, setAppPhase] = useState("splash"); // splash -> preparing -> home -> editor
  useEffect(() => {
    if (appPhase === "splash") {
      const t = setTimeout(() => setAppPhase("preparing"), 1800);
      return () => clearTimeout(t);
    }
    if (appPhase === "preparing") {
      const t = setTimeout(() => setAppPhase("home"), 2200);
      return () => clearTimeout(t);
    }
  }, [appPhase]);

 const [showHome, setShowHome] = useState(false);


  const [commandText, setCommandText] =
  useState("");

  const [mobileCommandHistory, setMobileCommandHistory] =
  useState(() => {
    try {
      const saved =
        localStorage.getItem(
          "mycadMobileCommandHistory"
        );

      const parsed = saved
        ? JSON.parse(saved)
        : [];

      return Array.isArray(parsed)
        ? parsed.slice(-30)
        : [];
    } catch (error) {
      console.error(
        "Command history load failed:",
        error
      );

      return [];
    }
  });

const [mobileCommandHistoryIndex, setMobileCommandHistoryIndex] =
  useState(-1);

  const [tool, setTool] = useState("select");

  const [objects, setObjects] = useState([]);

  const [selectedIndex, setSelectedIndex] = useState(null);

  const [selectedIndexes, setSelectedIndexes] = useState([]);

  const [selectionBox, setSelectionBox] = useState(null);
const [isSelecting, setIsSelecting] = useState(false);

  const [selectedMeasurementIndex, setSelectedMeasurementIndex] =
  useState(null);
  
  const [commandFirstIndex, setCommandFirstIndex] = useState(null);

  const [trimFirstIndex, setTrimFirstIndex] = useState(null);

  const [extendFirstIndex, setExtendFirstIndex] = useState(null);

  const [isDrawing, setIsDrawing] = useState(false);

  const [lineStart, setLineStart] = useState(null);

  const [showLineInput, setShowLineInput] = useState(false);

const [lineLengthInput, setLineLengthInput] = useState("");

const [pendingLinePoint, setPendingLinePoint] = useState(null);

  const [linePreview, setLinePreview] = useState(null);

const [layers, setLayers] = useState([
  {
    id: "layer-0",
    name: "Layer 0",
    visible: true,
    locked: false,
  },
]);

const [activeLayerId, setActiveLayerId] =
  useState("layer-0");

const [measureStart, setMeasureStart] =
  useState(null);

const [showMeasureMenu, setShowMeasureMenu] =
  useState(false);

const [measurements, setMeasurements] =
  useState([]);

 

/* =========================
   CIRCLE GRIP DRAG
========================= */

const handleCircleGripDragEnd = (
  index,
  gripType,
  e
) => {
  const node = e.target;

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map((object, objectIndex) => {
      if (
        objectIndex !== index ||
        object.type !== "circle"
      ) {
        return object;
      }

      /* CENTER GRIP */
      if (gripType === "center") {
        return {
          ...object,
          x: node.x(),
          y: node.y(),
        };
      }

      /* RADIUS GRIP */
      if (gripType === "radius") {
        const dx =
          node.x() - object.x;

        const dy =
          node.y() - object.y;

        const newRadius =
          Math.sqrt(
            dx * dx +
            dy * dy
          );

        if (newRadius < 1) {
          return object;
        }

        return {
          ...object,
          radius: newRadius,
        };
      }

      /* TRIM START ANGLE */
      if (gripType === "trim-start") {
        const dx =
          node.x() - object.x;

        const dy =
          node.y() - object.y;

        const angle =
          Math.atan2(dy, dx);

        return {
          ...object,
          trimStartAngle: angle,
          trimEnabled: true,
        };
      }

      /* TRIM END ANGLE */
      if (gripType === "trim-end") {
        const dx =
          node.x() - object.x;

        const dy =
          node.y() - object.y;

        const angle =
          Math.atan2(dy, dx);

        return {
          ...object,
          trimEndAngle: angle,
          trimEnabled: true,
        };
      }

      return object;
    });

  setObjects(
    updatedObjects
  );

  setSelectedIndex(index);

  setSelectedIndexes([
    index,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );
};

/* =========================
   ELLIPSE GRIP DRAG
========================= */

const handleEllipseGripDragEnd = (
  index,
  gripType,
  e
) => {
  const node = e.target;

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, objectIndex) => {
        if (
          objectIndex !== index ||
          object.type !== "ellipse"
        ) {
          return object;
        }

        /* CENTER GRIP */

        if (
          gripType === "center"
        ) {
          return {
            ...object,
            x: node.x(),
            y: node.y(),
          };
        }

/* HORIZONTAL GRIP — ROTATION AWARE */

if (gripType === "radiusX") {
  const rotation =
    (Number(object.rotation) || 0) *
    (Math.PI / 180);

  const dx = node.x() - object.x;
  const dy = node.y() - object.y;

  const localX =
    dx * Math.cos(rotation) +
    dy * Math.sin(rotation);

  return {
    ...object,
    radiusX: Math.max(
      1,
      Math.abs(localX)
    ),
  };
}
      
/* VERTICAL GRIP — ROTATION AWARE */

if (gripType === "radiusY") {
  const rotation =
    (Number(object.rotation) || 0) *
    (Math.PI / 180);

  const dx = node.x() - object.x;
  const dy = node.y() - object.y;

  const localY =
    -dx * Math.sin(rotation) +
    dy * Math.cos(rotation);

  return {
    ...object,
    radiusY: Math.max(
      1,
      Math.abs(localY)
    ),
  };
}

        return object;
      }
    );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(index);

  setSelectedIndexes([
    index,
  ]);

  setFuture([]);
};


    /* =========================
   ASSOCIATIVE CIRCLE DIMENSIONS
========================= */

useEffect(() => {
  setMeasurements((previousMeasurements) => {
    let changed = false;

    const updatedMeasurements =
      previousMeasurements.map(
        (measurement) => {

          /* =========================
             RADIUS / DIAMETER CHECK
          ========================= */

          if (
            measurement.type !==
              "radiusDimension" &&
            measurement.type !==
              "diameterDimension"
          ) {
            return measurement;
          }

          if (
            measurement.objectIndex ===
            undefined
          ) {
            return measurement;
          }

          const circle =
            objects[
              measurement.objectIndex
            ];

          if (
  !circle ||
  (
    circle.type !== "circle" &&
    circle.type !== "arc"
  )
) {
  return measurement;
}

          const cx = circle.x;
          const cy = circle.y;
          const radius = circle.radius;

          /* =========================
             DIRECTION
          ========================= */

          const dx =
            measurement.x2 -
            measurement.x1;

          const dy =
            measurement.y2 -
            measurement.y1;

          const length = Math.sqrt(
            dx * dx + dy * dy
          );

          let ux = 1;
          let uy = 0;

          if (length > 0) {
            ux = dx / length;
            uy = dy / length;
          }

          /* =========================
             RADIUS DIMENSION
          ========================= */

          if (
            measurement.type ===
            "radiusDimension"
          ) {
            const newX2 =
              cx + ux * radius;

            const newY2 =
              cy + uy * radius;

            const newRadius =
              Math.round(
                radius * 100
              ) / 100;

            if (
              measurement.x1 !== cx ||
              measurement.y1 !== cy ||
              measurement.x2 !== newX2 ||
              measurement.y2 !== newY2 ||
              measurement.radius !==
                newRadius
            ) {
              changed = true;

              return {
                ...measurement,
                x1: cx,
                y1: cy,
                x2: newX2,
                y2: newY2,
                radius: newRadius,
              };
            }

            return measurement;
          }

          /* =========================
             DIAMETER DIMENSION
          ========================= */

          if (
            measurement.type ===
            "diameterDimension"
          ) {
            const newX2 =
              cx + ux * radius;

            const newY2 =
              cy + uy * radius;

            const newX3 =
              cx - ux * radius;

            const newY3 =
              cy - uy * radius;

            const newDiameter =
              Math.round(
                radius * 2 * 100
              ) / 100;

            if (
              measurement.x1 !== cx ||
              measurement.y1 !== cy ||
              measurement.x2 !== newX2 ||
              measurement.y2 !== newY2 ||
              measurement.x3 !== newX3 ||
              measurement.y3 !== newY3 ||
              measurement.diameter !==
                newDiameter
            ) {
              changed = true;

              return {
                ...measurement,
                x1: cx,
                y1: cy,
                x2: newX2,
                y2: newY2,
                x3: newX3,
                y3: newY3,
                diameter:
                  newDiameter,
              };
            }

            return measurement;
          }

          return measurement;
        }
      );

    return changed
      ? updatedMeasurements
      : previousMeasurements;
  });
}, [objects]);

/* =========================
   ASSOCIATIVE ANGULAR DIMENSIONS
========================= */

useEffect(() => {
  setMeasurements((previousMeasurements) => {
    let changed = false;

    const updatedMeasurements =
      previousMeasurements.map((measurement) => {

        if (
          measurement.type !==
          "angularDimension"
        ) {
          return measurement;
        }

        if (
          measurement.objectIndex1 ===
            undefined ||
          measurement.objectIndex2 ===
            undefined ||
          measurement.objectIndex1 === null ||
          measurement.objectIndex2 === null
        ) {
          return measurement;
        }

        const line1 =
          objects[measurement.objectIndex1];

        const line2 =
          objects[measurement.objectIndex2];

        if (
          !line1 ||
          !line2 ||
          line1.type !== "line" ||
          line2.type !== "line"
        ) {
          return measurement;
        }

        if (
          !line1.points ||
          line1.points.length < 4 ||
          !line2.points ||
          line2.points.length < 4
        ) {
          return measurement;
        }

        const intersection =
          getInfiniteLineIntersection(
            line1,
            line2
          );

        if (!intersection) {
          return measurement;
        }

        const vertexX =
          intersection.x;

        const vertexY =
          intersection.y;

        const getDirectionPoint = (
          line,
          vertexX,
          vertexY,
          oldPoint
        ) => {

          const x1 = line.points[0];
          const y1 = line.points[1];

          const x2 = line.points[2];
          const y2 = line.points[3];

          const d1 = Math.hypot(
            oldPoint.x - x1,
            oldPoint.y - y1
          );

          const d2 = Math.hypot(
            oldPoint.x - x2,
            oldPoint.y - y2
          );

          const px =
            d1 > d2 ? x1 : x2;

          const py =
            d1 > d2 ? y1 : y2;

          const dx =
            px - vertexX;

          const dy =
            py - vertexY;

          const length = Math.hypot(
            dx,
            dy
          );

          if (length < 0.000001) {
            return {
              x: vertexX,
              y: vertexY,
            };
          }

          const oldDistance =
            Math.hypot(
              oldPoint.x -
                measurement.x1,
              oldPoint.y -
                measurement.y1
            );

          return {
            x:
              vertexX +
              (dx / length) *
                Math.max(
                  oldDistance,
                  30
                ),

            y:
              vertexY +
              (dy / length) *
                Math.max(
                  oldDistance,
                  30
                ),
          };
        };

        const oldPoint1 = {
          x:
            measurement.anglePoints?.[0]
              ?.x ??
            measurement.x1 ??
            vertexX,

          y:
            measurement.anglePoints?.[0]
              ?.y ??
            measurement.y1 ??
            vertexY,
        };

        const oldPoint2 = {
          x:
            measurement.anglePoints?.[2]
              ?.x ??
            measurement.x2 ??
            vertexX,

          y:
            measurement.anglePoints?.[2]
              ?.y ??
            measurement.y2 ??
            vertexY,
        };

        const point1 =
          getDirectionPoint(
            line1,
            vertexX,
            vertexY,
            oldPoint1
          );

        const point2 =
          getDirectionPoint(
            line2,
            vertexX,
            vertexY,
            oldPoint2
          );

        const newAnglePoints = [
          {
            x: point1.x,
            y: point1.y,
          },

          {
            x: vertexX,
            y: vertexY,
          },

          {
            x: point2.x,
            y: point2.y,
          },
        ];

        const oldAnglePoints =
          measurement.anglePoints || [];

        const samePoints =
          oldAnglePoints.length === 3 &&
          oldAnglePoints[0]?.x ===
            newAnglePoints[0].x &&
          oldAnglePoints[0]?.y ===
            newAnglePoints[0].y &&
          oldAnglePoints[1]?.x ===
            newAnglePoints[1].x &&
          oldAnglePoints[1]?.y ===
            newAnglePoints[1].y &&
          oldAnglePoints[2]?.x ===
            newAnglePoints[2].x &&
          oldAnglePoints[2]?.y ===
            newAnglePoints[2].y;

        if (!samePoints) {
          changed = true;

          return {
            ...measurement,

            anglePoints:
              newAnglePoints,

            x1: point1.x,
            y1: point1.y,

            x2: point2.x,
            y2: point2.y,
          };
        }

        return measurement;
      });

    return changed
      ? updatedMeasurements
      : previousMeasurements;
  });
}, [objects]);

/* =========================
   ASSOCIATIVE LINE /
   POLYLINE / RECTANGLE DIMENSIONS
========================= */

const previousObjectsRef =
  useRef(objects);

useEffect(() => {
  const previousObjects =
    previousObjectsRef.current;

  setMeasurements((previousMeasurements) => {
    let changed = false;

    const updatedMeasurements =
      previousMeasurements.map(
        (measurement) => {

          if (
            measurement.type !==
            "dimension"
          ) {
            return measurement;
          }

          if (
            measurement.objectIndex ===
              undefined ||
            measurement.objectIndex === null
          ) {
            return measurement;
          }

          const index =
            measurement.objectIndex;

          const oldObject =
            previousObjects[index];

          const newObject =
            objects[index];

          if (
            !oldObject ||
            !newObject ||
            oldObject.type !==
              newObject.type
          ) {
            return measurement;
          }

          /* =========================
             LINE
          ========================= */

          if (
            newObject.type === "line" &&
            oldObject.points?.length >= 4 &&
            newObject.points?.length >= 4
          ) {
            const oldX1 =
              oldObject.points[0];

            const oldY1 =
              oldObject.points[1];

            const oldX2 =
              oldObject.points[2];

            const oldY2 =
              oldObject.points[3];

            const newX1 =
              newObject.points[0];

            const newY1 =
              newObject.points[1];

            const newX2 =
              newObject.points[2];

            const newY2 =
              newObject.points[3];

            const dx =
              oldX2 - oldX1;

            const dy =
              oldY2 - oldY1;

            const lengthSquared =
              dx * dx + dy * dy;

            if (
              lengthSquared <
              0.000001
            ) {
              return measurement;
            }

            const getT = (
              px,
              py
            ) => {
              return (
                (
                  (px - oldX1) * dx +
                  (py - oldY1) * dy
                ) /
                lengthSquared
              );
            };

            const t1 =
              getT(
                measurement.x1,
                measurement.y1
              );

            const t2 =
              getT(
                measurement.x2,
                measurement.y2
              );

            const point1 = {
              x:
                newX1 +
                (newX2 - newX1) *
                  t1,

              y:
                newY1 +
                (newY2 - newY1) *
                  t1,
            };

            const point2 = {
              x:
                newX1 +
                (newX2 - newX1) *
                  t2,

              y:
                newY1 +
                (newY2 - newY1) *
                  t2,
            };

            const distance =
              Math.round(
                Math.hypot(
                  point2.x -
                    point1.x,

                  point2.y -
                    point1.y
                ) * 100
              ) / 100;

            if (
              measurement.x1 !==
                point1.x ||
              measurement.y1 !==
                point1.y ||
              measurement.x2 !==
                point2.x ||
              measurement.y2 !==
                point2.y ||
              measurement.distance !==
                distance
            ) {
              changed = true;

              return {
                ...measurement,

                x1: point1.x,
                y1: point1.y,

                x2: point2.x,
                y2: point2.y,

                distance,
              };
            }

            return measurement;
          }

          /* =========================
             POLYLINE
          ========================= */

          if (
            newObject.type ===
              "polyline" &&
            oldObject.points?.length >= 2 &&
            newObject.points?.length >= 2
          ) {
            const getBounds = (
              object
            ) => {

              const xs = [];
              const ys = [];

              for (
                let i = 0;
                i < object.points.length;
                i += 2
              ) {
                xs.push(
                  object.points[i]
                );

                ys.push(
                  object.points[i + 1]
                );
              }

              return {
                left: Math.min(...xs),
                right: Math.max(...xs),
                top: Math.min(...ys),
                bottom: Math.max(...ys),
              };
            };

            const oldBounds =
              getBounds(oldObject);

            const newBounds =
              getBounds(newObject);

            const oldWidth =
              oldBounds.right -
              oldBounds.left;

            const oldHeight =
              oldBounds.bottom -
              oldBounds.top;

            const mapPoint = (
              x,
              y
            ) => {

              const tx =
                oldWidth !== 0
                  ? (x -
                      oldBounds.left) /
                    oldWidth
                  : 0;

              const ty =
                oldHeight !== 0
                  ? (y -
                      oldBounds.top) /
                    oldHeight
                  : 0;

              return {
                x:
                  newBounds.left +
                  tx *
                    (
                      newBounds.right -
                      newBounds.left
                    ),

                y:
                  newBounds.top +
                  ty *
                    (
                      newBounds.bottom -
                      newBounds.top
                    ),
              };
            };

            const point1 =
              mapPoint(
                measurement.x1,
                measurement.y1
              );

            const point2 =
              mapPoint(
                measurement.x2,
                measurement.y2
              );

            const distance =
              Math.round(
                Math.hypot(
                  point2.x -
                    point1.x,

                  point2.y -
                    point1.y
                ) * 100
              ) / 100;

            if (
              measurement.x1 !==
                point1.x ||
              measurement.y1 !==
                point1.y ||
              measurement.x2 !==
                point2.x ||
              measurement.y2 !==
                point2.y ||
              measurement.distance !==
                distance
            ) {
              changed = true;

              return {
                ...measurement,

                x1: point1.x,
                y1: point1.y,

                x2: point2.x,
                y2: point2.y,

                distance,
              };
            }

            return measurement;
          }

          /* =========================
             RECTANGLE
          ========================= */

          if (
            newObject.type ===
            "rectangle"
          ) {
            const getBounds = (
              object
            ) => {
              return {
                left: Math.min(
                  object.x,
                  object.x +
                    object.width
                ),

                right: Math.max(
                  object.x,
                  object.x +
                    object.width
                ),

                top: Math.min(
                  object.y,
                  object.y +
                    object.height
                ),

                bottom: Math.max(
                  object.y,
                  object.y +
                    object.height
                ),
              };
            };

            const oldBounds =
              getBounds(oldObject);

            const newBounds =
              getBounds(newObject);

            const oldWidth =
              oldBounds.right -
              oldBounds.left;

            const oldHeight =
              oldBounds.bottom -
              oldBounds.top;

            const mapPoint = (
              x,
              y
            ) => {

              const tx =
                oldWidth !== 0
                  ? (x -
                      oldBounds.left) /
                    oldWidth
                  : 0;

              const ty =
                oldHeight !== 0
                  ? (y -
                      oldBounds.top) /
                    oldHeight
                  : 0;

              return {
                x:
                  newBounds.left +
                  tx *
                    (
                      newBounds.right -
                      newBounds.left
                    ),

                y:
                  newBounds.top +
                  ty *
                    (
                      newBounds.bottom -
                      newBounds.top
                    ),
              };
            };

            const point1 =
              mapPoint(
                measurement.x1,
                measurement.y1
              );

            const point2 =
              mapPoint(
                measurement.x2,
                measurement.y2
              );

            const distance =
              Math.round(
                Math.hypot(
                  point2.x -
                    point1.x,

                  point2.y -
                    point1.y
                ) * 100
              ) / 100;

            if (
              measurement.x1 !==
                point1.x ||
              measurement.y1 !==
                point1.y ||
              measurement.x2 !==
                point2.x ||
              measurement.y2 !==
                point2.y ||
              measurement.distance !==
                distance
            ) {
              changed = true;

              return {
                ...measurement,

                x1: point1.x,
                y1: point1.y,

                x2: point2.x,
                y2: point2.y,

                distance,
              };
            }

            return measurement;
          }

          return measurement;
        }
      );

    return changed
      ? updatedMeasurements
      : previousMeasurements;
  });

  previousObjectsRef.current =
    objects;

}, [objects]);

/* =========================
   AUTO ASSOCIATE DIMENSIONS
========================= */

useEffect(() => {
  setMeasurements((previousMeasurements) => {
    let changed = false;

    const updatedMeasurements =
      previousMeasurements.map(
        (measurement) => {

          /* ONLY NORMAL DIMENSIONS */
          if (
            measurement.type !==
            "dimension"
          ) {
            return measurement;
          }

          /* ALREADY ASSOCIATED */
          if (
            measurement.objectIndex !==
              undefined &&
            measurement.objectIndex !== null
          ) {
            return measurement;
          }

          const mx =
            (
              measurement.x1 +
              measurement.x2
            ) / 2;

          const my =
            (
              measurement.y1 +
              measurement.y2
            ) / 2;

          let nearestIndex = null;
          let nearestDistance = Infinity;

          objects.forEach(
            (object, objectIndex) => {

              let distance = Infinity;

              /* =====================
                 LINE
              ===================== */

              if (
                object.type === "line" &&
                object.points?.length >= 4
              ) {
                const x1 =
                  object.points[0];

                const y1 =
                  object.points[1];

                const x2 =
                  object.points[2];

                const y2 =
                  object.points[3];

                const dx = x2 - x1;
                const dy = y2 - y1;

                const lengthSquared =
                  dx * dx + dy * dy;

                if (
                  lengthSquared > 0
                ) {
                  let t =
                    (
                      (mx - x1) * dx +
                      (my - y1) * dy
                    ) /
                    lengthSquared;

                  t = Math.max(
                    0,
                    Math.min(1, t)
                  );

                  const px =
                    x1 + t * dx;

                  const py =
                    y1 + t * dy;

                  distance =
                    Math.hypot(
                      mx - px,
                      my - py
                    );
                }
              }

              /* =====================
                 POLYLINE
              ===================== */

              if (
                object.type ===
                  "polyline" &&
                object.points?.length >= 4
              ) {
                for (
                  let i = 0;
                  i <
                    object.points.length -
                      2;
                  i += 2
                ) {
                  const x1 =
                    object.points[i];

                  const y1 =
                    object.points[i + 1];

                  const x2 =
                    object.points[i + 2];

                  const y2 =
                    object.points[i + 3];

                  const dx =
                    x2 - x1;

                  const dy =
                    y2 - y1;

                  const lengthSquared =
                    dx * dx + dy * dy;

                  if (
                    lengthSquared <= 0
                  ) {
                    continue;
                  }

                  let t =
                    (
                      (mx - x1) * dx +
                      (my - y1) * dy
                    ) /
                    lengthSquared;

                  t = Math.max(
                    0,
                    Math.min(1, t)
                  );

                  const px =
                    x1 + t * dx;

                  const py =
                    y1 + t * dy;

                  const segmentDistance =
                    Math.hypot(
                      mx - px,
                      my - py
                    );

                  distance =
                    Math.min(
                      distance,
                      segmentDistance
                    );
                }
              }

              /* =====================
                 RECTANGLE
              ===================== */

              if (
                object.type ===
                "rectangle"
              ) {
                const left =
                  Math.min(
                    object.x,
                    object.x +
                      object.width
                  );

                const right =
                  Math.max(
                    object.x,
                    object.x +
                      object.width
                  );

                const top =
                  Math.min(
                    object.y,
                    object.y +
                      object.height
                  );

                const bottom =
                  Math.max(
                    object.y,
                    object.y +
                      object.height
                  );

                const nearestX =
                  Math.max(
                    left,
                    Math.min(
                      mx,
                      right
                    )
                  );

                const nearestY =
                  Math.max(
                    top,
                    Math.min(
                      my,
                      bottom
                    )
                  );

                distance =
                  Math.hypot(
                    mx - nearestX,
                    my - nearestY
                  );
              }

              if (
                distance <
                  nearestDistance
              ) {
                nearestDistance =
                  distance;

                nearestIndex =
                  objectIndex;
              }
            }
          );

          /* 50 PX ASSOCIATION RANGE */

          if (
            nearestIndex !== null &&
            nearestDistance <= 50
          ) {
            changed = true;

            return {
              ...measurement,
              objectIndex:
                nearestIndex,
            };
          }

          return measurement;
        }
      );

    return changed
      ? updatedMeasurements
      : previousMeasurements;
  });
}, [objects]);

/* =========================
   CLEAN INVALID ASSOCIATIONS
========================= */

useEffect(() => {
  setMeasurements((previousMeasurements) => {

    const updatedMeasurements =
      previousMeasurements.filter(
        (measurement) => {

          /* NORMAL DIMENSION */
          if (
            measurement.type ===
            "dimension"
          ) {
            if (
              measurement.objectIndex ===
                undefined ||
              measurement.objectIndex === null
            ) {
              return true;
            }

            const object =
              objects[
                measurement.objectIndex
              ];

            return !!object;
          }

          /* RADIUS / DIAMETER */
          if (
            measurement.type ===
              "radiusDimension" ||
            measurement.type ===
              "diameterDimension"
          ) {
            if (
              measurement.objectIndex ===
                undefined ||
              measurement.objectIndex === null
            ) {
              return true;
            }

            const object =
              objects[
                measurement.objectIndex
              ];

            return (
  !!object &&
  (
    object.type === "circle" ||
    object.type === "arc"
  )
);
          }

          /* ANGULAR */
          if (
            measurement.type ===
            "angularDimension"
          ) {
            const line1 =
              objects[
                measurement.objectIndex1
              ];

            const line2 =
              objects[
                measurement.objectIndex2
              ];

            return (
              !!line1 &&
              !!line2 &&
              line1.type === "line" &&
              line2.type === "line"
            );
          }

          return true;
        }
      );

    if (
      updatedMeasurements.length !==
      previousMeasurements.length
    ) {
      return updatedMeasurements;
    }

    return previousMeasurements;
  });
}, [objects]);

/* =========================
   FIX DIMENSION INDEXES
   AFTER OBJECT DELETE
========================= */

const objectListBeforeDeleteRef =
  useRef(objects);

useEffect(() => {
  const previousObjects =
    objectListBeforeDeleteRef.current;

  /* OBJECT COUNT SAME */
  if (
    previousObjects.length ===
    objects.length
  ) {
    objectListBeforeDeleteRef.current =
      objects;

    return;
  }

  /* ONLY HANDLE OBJECT DELETE */
  if (
    objects.length <
    previousObjects.length
  ) {
    let deletedIndex = -1;

    for (
      let i = 0;
      i < previousObjects.length;
      i++
    ) {
      if (
        previousObjects[i] !==
        objects[i]
      ) {
        deletedIndex = i;
        break;
      }
    }

    /*
      IF DELETE WAS FROM THE END,
      THE ABOVE LOOP MAY NOT FIND IT.
    */
    if (deletedIndex === -1) {
      deletedIndex =
        objects.length;
    }

    setMeasurements(
      (previousMeasurements) => {

        let changed = false;

        const updatedMeasurements =
          previousMeasurements
            .map((measurement) => {

              /* =====================
                 NORMAL DIMENSION
              ===================== */

              if (
                measurement.type ===
                "dimension"
              ) {
                if (
                  measurement.objectIndex ===
                    undefined ||
                  measurement.objectIndex === null
                ) {
                  return measurement;
                }

                if (
                  measurement.objectIndex ===
                  deletedIndex
                ) {
                  changed = true;
                  return null;
                }

                if (
                  measurement.objectIndex >
                  deletedIndex
                ) {
                  changed = true;

                  return {
                    ...measurement,
                    objectIndex:
                      measurement.objectIndex -
                      1,
                  };
                }

                return measurement;
              }

              /* =====================
                 CIRCLE DIMENSION
              ===================== */

              if (
                measurement.type ===
                  "radiusDimension" ||
                measurement.type ===
                  "diameterDimension"
              ) {
                if (
                  measurement.objectIndex ===
                    undefined ||
                  measurement.objectIndex === null
                ) {
                  return measurement;
                }

                if (
                  measurement.objectIndex ===
                  deletedIndex
                ) {
                  changed = true;
                  return null;
                }

                if (
                  measurement.objectIndex >
                  deletedIndex
                ) {
                  changed = true;

                  return {
                    ...measurement,
                    objectIndex:
                      measurement.objectIndex -
                      1,
                  };
                }

                return measurement;
              }

              /* =====================
                 ANGULAR DIMENSION
              ===================== */

              if (
                measurement.type ===
                "angularDimension"
              ) {
                let updatedMeasurement =
                  measurement;

                let angularChanged =
                  false;

                if (
                  measurement.objectIndex1 ===
                  deletedIndex
                ) {
                  changed = true;
                  return null;
                }

                if (
                  measurement.objectIndex2 ===
                  deletedIndex
                ) {
                  changed = true;
                  return null;
                }

                if (
                  measurement.objectIndex1 >
                  deletedIndex
                ) {
                  updatedMeasurement = {
                    ...updatedMeasurement,
                    objectIndex1:
                      measurement.objectIndex1 -
                      1,
                  };

                  angularChanged = true;
                }

                if (
                  measurement.objectIndex2 >
                  deletedIndex
                ) {
                  updatedMeasurement = {
                    ...updatedMeasurement,
                    objectIndex2:
                      measurement.objectIndex2 -
                      1,
                  };

                  angularChanged = true;
                }

                if (
                  angularChanged
                ) {
                  changed = true;
                  return updatedMeasurement;
                }

                return measurement;
              }

              return measurement;
            })
            .filter(
              (measurement) =>
                measurement !== null
            );

        return changed
          ? updatedMeasurements
          : previousMeasurements;
      }
    );
  }

  objectListBeforeDeleteRef.current =
    objects;

}, [objects]);

    const [anglePoints, setAnglePoints] =
  useState([]);

  const [arcPoints, setArcPoints] =
  useState([]);

  const [scale, setScale] = useState(1);

  const [position, setPosition] = useState(() => ({
  x:
    (window.innerWidth <= 768
      ? window.innerWidth
      : window.innerWidth - 298) / 2,

  y:
    (window.innerWidth <= 768
      ? window.innerHeight - 87 - 64
      : window.innerHeight - 87) / 2,
}));

  const [viewportSize, setViewportSize] = useState({
  width: window.innerWidth,
  height: window.innerHeight,
});

useEffect(() => {
  const handleResize = () => {
    setViewportSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  window.addEventListener(
    "resize",
    handleResize
  );

  return () => {
    window.removeEventListener(
      "resize",
      handleResize
    );
  };
}, []);

useEffect(() => {
  const handleOrientationChange = () => {
    setTimeout(() => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);
  };

  window.addEventListener(
    "orientationchange",
    handleOrientationChange
  );

  return () => {
    window.removeEventListener(
      "orientationchange",
      handleOrientationChange
    );
  };
}, []);

  const [isPanning, setIsPanning] =
  useState(false);

  const [mousePosition, setMousePosition] =
    useState({
      x: 0,
      y: 0,
    });
    const [snapPoint, setSnapPoint] = useState(null);

    const [snapType, setSnapType] =
  useState("");

const [objectSnapEnabled, setObjectSnapEnabled] =
  useState(true);

  const [orthoEnabled, setOrthoEnabled] =
  useState(false);

  const [polarEnabled, setPolarEnabled] =
  useState(false);

  const [polarAngleStep, setPolarAngleStep] =
  useState(45);

  const [gridEnabled, setGridEnabled] =
  useState(true);

  const [gridSnapEnabled, setGridSnapEnabled] =
  useState(true);

  const [objectSnapTrackingEnabled, setObjectSnapTrackingEnabled] =
  useState(false);

  const [dynamicInputEnabled, setDynamicInputEnabled] =
  useState(true);

  const [showMobileLayers, setShowMobileLayers] = useState(false);

  const [showMobileProperties, setShowMobileProperties] = useState(false);

  /* =========================
   MOBILE BLOCKS PANEL
========================= */

const [showMobileBlocks, setShowMobileBlocks] =
  useState(false);

  /* =========================
   MOBILE ATTACHMENTS
========================= */

const [showMobileAttachments, setShowMobileAttachments] =
  useState(false);

  /* =========================
   MOBILE SETTINGS PANEL
========================= */

const [showMobileSettings, setShowMobileSettings] =
  useState(false);

  const [
  mobileRightToolbarCollapsed,
  setMobileRightToolbarCollapsed,
] = useState(false);

const [mobileAttachments, setMobileAttachments] =
  useState(() => {
    try {
      const saved = localStorage.getItem("mycadMobileAttachments");
      const parsed = JSON.parse(saved || "[]");

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

const attachmentInputRef = useRef(null);

useEffect(() => {
  try {
    localStorage.setItem(
      "mycadMobileAttachments",
      JSON.stringify(mobileAttachments)
    );
  } catch (error) {
    console.warn("Attachments save nahi ho paye:", error);
  }
}, [mobileAttachments]);

  /* =========================
   MOBILE VIEWS PANEL
========================= */

const [showMobileViews, setShowMobileViews] =
  useState(false);


  /* =========================
   MOBILE TRACE
========================= */

const [showMobileTrace, setShowMobileTrace] =
  useState(false);

const [mobileTraceList, setMobileTraceList] =
  useState(() => {
    try {
      const saved =
        localStorage.getItem("mycadMobileTraces");

      const parsed = JSON.parse(saved || "[]");

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

const [activeTraceId, setActiveTraceId] =
  useState(null);

const [traceEditMode, setTraceEditMode] =
  useState(false);

const [currentTracePoints, setCurrentTracePoints] =
  useState([]);

const traceDrawingRef = useRef(false);

useEffect(() => {
  try {
    localStorage.setItem(
      "mycadMobileTraces",
      JSON.stringify(mobileTraceList)
    );
  } catch (error) {
    console.warn("Trace save failed:", error);
  }
}, [mobileTraceList]);

  const [saveMessage, setSaveMessage] = useState("");

useEffect(() => {
  if (!saveMessage) return;

  const timer = window.setTimeout(() => {
    setSaveMessage("");
  }, 2500);

  return () => window.clearTimeout(timer);
}, [saveMessage]);

  const [showMobileFileMenu, setShowMobileFileMenu] = useState(false);

  /* =========================
   MOBILE COMMAND PANEL
========================= */

const [mobileCommandPanel, setMobileCommandPanel] =
  useState("home");

const openMobilePanel = (panel) => {
  // Purane mobile overlays close
  setShowMobileLayers(false);
  setShowMobileProperties(false);

  // Purana command/input clear
  setCommandText("");

  // Naya panel open
  setMobileCommandPanel(panel);
};

const closeMobilePanel = () => {
  setCommandText("");
  setMobileCommandPanel("home");
};

/* =========================
   ATTACH IMAGE / PDF
========================= */

const handleMobileAttachment = (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  if (!isImage && !isPdf) {
    window.alert("Filhaal sirf image aur PDF attach kar sakte ho.");
    event.target.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    window.alert("File 2 MB se chhoti honi chahiye.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result !== "string") {
      window.alert("File read nahi ho payi.");
      return;
    }

    const attachment = {
      id: `attachment-${Date.now()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: reader.result,
    };

    setMobileAttachments((previous) => [
      attachment,
      ...previous,
    ]);
  };

  reader.onerror = () => {
    window.alert("File attach nahi ho payi.");
  };

  reader.readAsDataURL(file);
  event.target.value = "";
};

const selectMobileTool = (nextTool) => {
  setShowMobileProperties(false);
  setShowMobileLayers(false);
  setCommandText("");

  /*
    Measure / Dimension tools ke
    options panel ko open rakho.
  */
   if (
    nextTool === "measure" ||
    nextTool === "dimension" ||
    nextTool === "radiusDimension" ||
    nextTool === "diameterDimension" ||
    nextTool === "angularDimension" ||
    nextTool === "area" ||
    nextTool === "volume" ||
    nextTool === "quickMeasure"
  ) {
    setMobileCommandPanel("measure");
  } else {
    setMobileCommandPanel("home");
  }
  changeTool(nextTool);
};

/* =========================
   TRACE — CREATE / OPEN / EDIT
========================= */

const createMobileTrace = () => {
  const id = `trace-${Date.now()}`;

  const newTrace = {
    id,
    name: `Trace ${mobileTraceList.length + 1}`,
    strokes: [],
  };

  setMobileTraceList((previous) => [
    ...previous,
    newTrace,
  ]);

  setActiveTraceId(id);
  setTraceEditMode(true);
  setCurrentTracePoints([]);
  traceDrawingRef.current = false;

  setShowMobileTrace(true);
  setShowMobileLayers(false);
  setShowMobileProperties(false);

  setMobileCommandPanel("home");
  setCommandText("");
};

const openMobileTrace = (trace) => {
  setActiveTraceId(trace.id);
  setTraceEditMode(false);
  setCurrentTracePoints([]);
  traceDrawingRef.current = false;
  setShowMobileTrace(true);
};

const editMobileTrace = (trace) => {
  setActiveTraceId(trace.id);
  setTraceEditMode(true);
  setCurrentTracePoints([]);
  traceDrawingRef.current = false;
  setShowMobileTrace(true);

  setShowMobileLayers(false);
  setShowMobileProperties(false);
};

const finishMobileTrace = () => {
  setTraceEditMode(false);
  setCurrentTracePoints([]);
  traceDrawingRef.current = false;
};

const closeMobileTracePanel = () => {
  setShowMobileTrace(false);
  finishMobileTrace();
};

const deleteMobileTrace = (traceId) => {
  const traceToDelete = mobileTraceList.find(
    (trace) => trace.id === traceId
  );

  if (!traceToDelete) return;

  const confirmed = window.confirm(
    `Delete "${traceToDelete.name}"?`
  );

  if (!confirmed) return;

  setMobileTraceList((previous) =>
    previous.filter((trace) => trace.id !== traceId)
  );

  if (activeTraceId === traceId) {
    setActiveTraceId(null);
    setTraceEditMode(false);
    setCurrentTracePoints([]);
    traceDrawingRef.current = false;
  }
};


/* =========================
   TRACE — CANVAS POINT
========================= */

const getMobileTracePoint = (e) => {
  const stage = e?.target?.getStage();

  if (!stage) return null;

  if (e.evt?.touches?.length) {
    stage.setPointersPositions(e.evt);
  }

  const pointer = stage.getPointerPosition();

  if (!pointer) return null;

  const safeScale = Number(scale) || 1;

  return {
    x: (pointer.x - position.x) / safeScale,
    y: (pointer.y - position.y) / safeScale,
  };
};


/* =========================
   TRACE — FREEHAND DRAWING
========================= */

const startMobileTraceStroke = (e) => {
  if (e) e.cancelBubble = true;

  if (!traceEditMode || !activeTraceId) return;

  if (e?.evt?.cancelable) {
    e.evt.preventDefault();
  }

  const point = getMobileTracePoint(e);

  if (!point) return;

  traceDrawingRef.current = true;

  setCurrentTracePoints([
    point.x,
    point.y,
  ]);
};

const moveMobileTraceStroke = (e) => {
  if (e) e.cancelBubble = true;

  if (!traceEditMode || !traceDrawingRef.current) {
    return;
  }

  if (e?.evt?.cancelable) {
    e.evt.preventDefault();
  }

  const point = getMobileTracePoint(e);

  if (!point) return;

  setCurrentTracePoints((previous) => [
    ...previous,
    point.x,
    point.y,
  ]);
};

const finishMobileTraceStroke = (e) => {
  if (e) e.cancelBubble = true;

  if (!traceDrawingRef.current) return;

  traceDrawingRef.current = false;

  const points = [...currentTracePoints];

  if (
    activeTraceId &&
    points.length >= 4
  ) {
    const stroke = {
      id: `stroke-${Date.now()}`,
      points,
      color: "#39c5ff",
    };

    setMobileTraceList((previous) =>
      previous.map((trace) =>
        trace.id === activeTraceId
          ? {
              ...trace,
              strokes: [
                ...(trace.strokes || []),
                stroke,
              ],
            }
          : trace
      )
    );
  }

  setCurrentTracePoints([]);
};

{/* =====================================================
    MOBILE SELECT MENU
===================================================== */}

{mobileCommandPanel === "select" && (
  <>
    {[
      {
        label: "Erase",
        icon: "🖉",
        action: () => {
          const hasSelection =
            selectedIndex !== null ||
            selectedIndexes.length > 0 ||
            selectedMeasurementIndex !== null;

          if (!hasSelection) {
            window.alert(
              "Pehle canvas par object select karo."
            );
            return;
          }

          deleteSelected();
        },
      },
      {
        label: "Copy",
        icon: "📋",
        action: () => selectMobileTool("copy"),
      },
      {
        label: "Move",
        icon: "✥",
        action: () => selectMobileTool("move"),
      },
      {
        label: "Scale",
        icon: "⤢",
        action: () => selectMobileTool("scale"),
      },
      {
        label: "Array",
        icon: "▦",
        action: () => selectMobileTool("array"),
      },
      {
        label: "Rotate",
        icon: "🔄",
        action: () => selectMobileTool("rotate"),
      },
      {
        label: "Mirror",
        icon: "🪞",
        action: () => selectMobileTool("mirror"),
      },
      {
        label: "Trim",
        icon: "✂",
        action: () => selectMobileTool("trim"),
      },
      {
        label: "Extend",
        icon: "↔",
        action: () => selectMobileTool("extend"),
      },
      {
        label: "Stretch",
        icon: "↔",
        action: () => selectMobileTool("stretch"),
      },
      {
        label: "Offset",
        icon: "⬌",
        action: () => selectMobileTool("offset"),
      },
      {
        label: "Fillet",
        icon: "◯",
        action: () => selectMobileTool("fillet"),
      },
      {
        label: "Chamfer",
        icon: "◇",
        action: () => selectMobileTool("chamfer"),
      },
      {
        label: "Explode",
        icon: "💥",
        action: () => selectMobileTool("explode"),
      },
      {
        label: "Join",
        icon: "🔗",
        action: () => selectMobileTool("join"),
      },
    ].map((item) => (
      <button
        key={item.label}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          item.action();
        }}
      >
        {item.icon} {item.label}
      </button>
    ))}
  </>
)}

/* =========================
   MOBILE FIND
========================= */

const runMobileFind = () => {
  const searchText =
    commandText.trim();

  if (!searchText) {
    return;
  }

  const query =
    searchText.toLowerCase();

  const visibleObjects =
    getVisibleObjectsForFind();

  const foundObject =
    visibleObjects.find(
      (object) =>
        String(object?.type || "")
          .toLowerCase()
          .includes(query) ||
        String(object?.text || "")
          .toLowerCase()
          .includes(query)
    );

  const foundIndex =
    foundObject
      ? objects.indexOf(foundObject)
      : -1;

  if (foundIndex !== -1) {
    setSelectedIndexes([
      foundIndex,
    ]);

    setSelectedIndex(
      foundIndex
    );

    setMobileCommandPanel("home");
    setCommandText("");
    changeTool("select");
    return;
  }

  window.alert(
    `No "${searchText}" object found.`
  );
};

/* =========================
   MOBILE COMMAND RUNNER
========================= */

const runMobileCommand = (rawCommand) => {
  const command = String(
    rawCommand || ""
  )
    .trim()
    .toLowerCase();

  if (!command) {
    return;
  }

  /* =========================
   KEYBOARD COMMAND ALIASES
   FOR MOBILE SUGGESTIONS
========================= */

if (command === "f1") {
  setShowHome(true);
  setCommandText("");
  return;
}

if (command === "f2") {
  if (
    mobileCommandHistory.length > 0
  ) {
    const lastCommand =
      mobileCommandHistory[
        mobileCommandHistory.length - 1
      ];

    setCommandText(
      lastCommand || ""
    );
  }

  return;
}

if (command === "f3") {
  setObjectSnapEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (command === "f7") {
  setGridEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (command === "f8") {
  toggleOrtho();
  setCommandText("");
  return;
}

if (command === "f9") {
  setGridSnapEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (command === "f10") {
  togglePolar();
  setCommandText("");
  return;
}

if (command === "f11") {
  setObjectSnapTrackingEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (command === "f12") {
  setDynamicInputEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (
  command === "ctrl+shift+k"
) {
  runMobileCommand("layers");
  return;
}

if (
  command === "ctrl+shift+u"
) {
  runMobileCommand("properties");
  return;
}

/* =========================
   MOBILE SHORTCUT COMMANDS
========================= */

/* =========================
   CTRL + ALT + B = RADIUS
========================= */

if (
  command === "ctrl+alt+b"
) {
  runMobileCommand(
    "radiusdimension"
  );

  return;
}

/* =========================
   CTRL + SHIFT MODIFY
   MOBILE COMMANDS
========================= */

if (command === "ctrl+shift+v") {
  runMobileCommand("move");
  return;
}

if (command === "ctrl+shift+w") {
  runMobileCommand("offset");
  return;
}

if (command === "ctrl+shift+b") {
  runMobileCommand("scale");
  return;
}

if (command === "ctrl+shift+q") {
  runMobileCommand("erase");
  return;
}

if (command === "ctrl+shift+n") {
  runMobileCommand("trim");
  return;
}

if (command === "ctrl+shift+y") {
  runMobileCommand("extend");
  return;
}

if (command === "ctrl+shift+i") {
  runMobileCommand("mirror");
  return;
}

/* =========================
   CTRL + SHIFT DRAWING
========================= */

if (command === "ctrl+shift+l") {
  runMobileCommand("line");
  return;
}

if (command === "ctrl+shift+c") {
  runMobileCommand("circle");
  return;
}

if (command === "ctrl+shift+r") {
  runMobileCommand("rectangle");
  return;
}

if (command === "ctrl+shift+t") {
  runMobileCommand("text");
  return;
}

if (command === "ctrl+shift+h") {
  runMobileCommand("hatch");
  return;
}

/* =========================
   CTRL + ALT MEASURE
========================= */

if (command === "ctrl+alt+m") {
  runMobileCommand("measure");
  return;
}

if (command === "ctrl+alt+a") {
  runMobileCommand("area");
  return;
}

if (command === "ctrl+alt+d") {
  runMobileCommand("dimension");
  return;
}

if (command === "ctrl+alt+g") {
  runMobileCommand("angulardimension");
  return;
}

if (command === "ctrl+alt+i") {
  runMobileCommand("diameterdimension");
  return;
}

  /* =========================
   VIEW / DRAFTING COMMANDS
========================= */

if (
  command === "ortho" ||
  command === "f8"
) {
  toggleOrtho();

  setCommandText("");
  return;
}

if (
  command === "polar" ||
  command === "f10"
) {
  setPolarEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (
  command === "grid" ||
  command === "f7"
) {
  setGridEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (
  command === "snap" ||
  command === "f9"
) {
  setGridSnapEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (
  command === "osnap" ||
  command === "f3"
) {
  setObjectSnapEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (
  command === "dyn" ||
  command === "f12"
) {
  setDynamicInputEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

if (
  command === "track" ||
  command === "f11"
) {
  setObjectSnapTrackingEnabled(
    (prev) => !prev
  );

  setCommandText("");
  return;
}

  setMobileCommandHistory((prev) => {
  const next = [
    ...prev,
    command,
  ].slice(-30);

  try {
    localStorage.setItem(
      "mycadMobileCommandHistory",
      JSON.stringify(next)
    );
  } catch (error) {
    console.error(
      "Command history save failed:",
      error
    );
  }

  return next;
});

setMobileCommandHistoryIndex(-1);

/* =========================
   MOBILE PANEL COMMANDS
========================= */

if (
  command === "properties" ||
  command === "prop" ||
  command === "pr"
) {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Pehle object select karo."
    );
    return;
  }

  setShowMobileLayers(false);
  setShowMobileProperties(true);
  setMobileCommandPanel("home");
  setCommandText("");

  return;
}

if (
  command === "layers" ||
  command === "layer" ||
  command === "la"
) {
  setShowMobileProperties(false);
  setShowMobileLayers(true);
  setCommandText("");

  return;
}

/* =========================
   FILE COMMANDS
========================= */

if (
  command === "save" ||
  command === "qsave" ||
  command === "q"
) {
  try {
    saveDrawing();
  } catch (error) {
    console.error(
      "Save failed:",
      error
    );

    window.alert(
      "Save nahi ho paya."
    );
  }

  setCommandText("");
  return;
}

/* =========================
   NEW DRAWING
========================= */

if (
  command === "new" ||
  command === "n"
) {
  try {
    clearDrawing();
  } catch (error) {
    console.error(
      "New drawing failed:",
      error
    );

    window.alert(
      "New drawing nahi ban payi."
    );
  }

  setCommandText("");
  return;
}

if (command === "open") {
  try {
    openDrawing();
  } catch (error) {
    console.error(
      "Open failed:",
      error
    );

    window.alert(
      "Drawing open nahi ho payi."
    );
  }

  setCommandText("");
  return;
}

/* =========================
   NEW / RESTORE / EXPORT
========================= */

if (
  command === "new"
) {
  try {
    clearDrawing();
  } catch (error) {
    console.error(
      "New drawing failed:",
      error
    );
  }

  setCommandText("");
  return;
}

if (
  command === "restore" ||
  command === "restoreautosave" ||
  command === "r"
) {
  restoreAutoSave();
  setCommandText("");
  return;
}

if (
  command === "clearautosave" ||
  command === "ca"
) {
  clearAutoSave();
  setCommandText("");
  return;
}

if (
  command === "exportpng" ||
  command === "png" ||
  command === "ep"
) {
  exportPNG();
  setCommandText("");
  return;
}

if (
  command === "exportsvg" ||
  command === "svg" ||
  command === "es"
) {
  exportSVG();
  setCommandText("");
  return;
}

/* =========================
   EXPORT DXF
========================= */

if (
  command === "exportdxf" ||
  command === "dxf" ||
  command === "ed"
) {
  exportDXF();
  setCommandText("");
  return;
}

    /* =========================
     SPECIAL MOBILE COMMANDS
  ========================= */

  if (
    command === "u" ||
    command === "undo"
  ) {
    if (!undoActiveLineSegment()) {
      try {
        undo();
      } catch (error) {
        console.error(
          "Undo failed:",
          error
        );
      }
    }

    setCommandText("");
    return;
  }

  if (
  command === "redo" ||
  command === "y"
) {
  try {
    redo();
  } catch (error) {
    console.error(
      "Redo failed:",
      error
    );
  }

  setCommandText("");
  return;
}

  /* =========================
   CLOSE ACTIVE COMMAND
========================= */
if (command === "close") {
  if (tool === "polyline") {
    closeActivePolyline();
    return;
  }

  setLineStart(null);
  setLinePreview(null);
  setPendingLinePoint(null);
  setLineLengthInput("");
  setShowLineInput(false);
  setIsDrawing(false);

  actionStartRef.current = null;

  setSnapPoint(null);
  setSnapType("");

  setCommandText("");
  setMobileCommandPanel("home");

  changeTool("select");

  return;
}
/* =========================
   HOME PANEL
========================= */

if (command === "home") {
  setCommandText("");
  setShowMobileProperties(false);
  setShowMobileLayers(false);
  setMobileCommandPanel("home");
  return;
}

  if (
    command === "esc" ||
    command === "cancel"
  ) {
    setLineStart(null);
    setLinePreview(null);
    setPendingLinePoint(null);
    setLineLengthInput("");
    setShowLineInput(false);

    setIsDrawing(false);

    setMeasureStart(null);
    setAnglePoints([]);

    setSnapType("");
    setSnapPoint(null);

    setSelectedIndex(null);
    setSelectedIndexes([]);

    setSelectedMeasurementIndex(null);
    setCommandFirstIndex(null);

    actionStartRef.current = null;
    moveStartRef.current = null;
    stretchStartRef.current = null;

    setShowMobileProperties(false);
    setShowMobileLayers(false);

    setCommandText("");
    setMobileCommandPanel("home");

    changeTool("select");
    return;
  }

if (
  command === "zf" ||
  command === "zoomfit" ||
  command === "ze"
) {
  zoomFit();
  setCommandText("");
  return;
}

  if (command === "find") {
    setCommandText("");
    openMobilePanel("find");
    return;
  }

  /* =========================
   ZOOM IN / ZOOM OUT
========================= */

if (
  command === "zi" ||
  command === "zoomin"
) {
  setScale((prevScale) =>
    Math.min(prevScale * 1.2, 100)
  );

  setCommandText("");
  return;
}

if (
  command === "zo" ||
  command === "zoomout"
) {
  setScale((prevScale) =>
    Math.max(prevScale / 1.2, 0.01)
  );

  setCommandText("");
  return;
}

 const toolMap = {

  /* BASIC */
  select: "select",
  s: "select",

  line: "line",
l: "line",
ln: "line",

polyline: "polyline",
pl: "polyline",
pline: "polyline",


spline: "spline",
spl: "spline",

arc: "arc",

ellipse: "ellipse",
ell: "ellipse",

circle: "circle",
c: "circle",
ci: "circle",

rectangle: "rectangle",
rec: "rectangle",
rectang: "rectangle",

text: "text",
t: "text",
dt: "text",

hatch: "hatch",
h: "hatch",
bh: "hatch",

point: "point",
po: "point",

array: "array",
arr: "array",
arrayclassic: "array",

  /* MEASURE / DIMENSION */
 measure: "measure",
me: "measure",
distance: "measure",
dist: "measure",
di: "measure",

quickmeasure: "quickMeasure",
quick: "quickMeasure",
qm: "quickMeasure",

  dimension: "dimension",
dim: "dimension",
d: "dimension",

  area: "area",
ar: "area",
aa: "area",

  /* VOLUME */
  volume: "volume",
  vol: "volume",

  angulardimension: "angularDimension",
ang: "angularDimension",
ad: "angularDimension",

radiusdimension: "radiusDimension",
rad: "radiusDimension",
rd: "radiusDimension",

  diameterdimension: "diameterDimension",
dia: "diameterDimension",
dd: "diameterDimension",


  /* MODIFY */
 move: "move",
m: "move",
mv: "move",

copy: "copy",
co: "copy",
cp: "copy",

rotate: "rotate",
ro: "rotate",
rt: "rotate",
rr: "rotate",

trim: "trim",
tr: "trim",
trm: "trim",
trimcommand: "trim",

extend: "extend",
ex: "extend",
ext: "extend",
exd: "extend",

lengthen: "lengthen",
len: "lengthen",

stretch: "stretch",
sst: "stretch",
st: "stretch",

offset: "offset",
o: "offset",
of: "offset",
ofs: "offset",

mirror: "mirror",
mi: "mirror",
mr: "mirror",

scale: "scale",
sc: "scale",
sl: "scale",

fillet: "fillet",
f: "fillet",
fil: "fillet",

chamfer: "chamfer",
cha: "chamfer",
ch: "chamfer",

array: "array",
arr: "array",
arrayclassic: "array",

explode: "explode",
x: "explode",
exp: "explode",

align: "align",
al: "align",

break: "break",
br: "break",

group: "group",
g: "group",
grp: "group",

ungroup: "ungroup",
ug: "ungroup",
ung: "ungroup",

block: "block",
b: "block",
blk: "block",

renameblock: "renameblock",
rb: "renameblock",

deleteblock: "deleteblock",
db: "deleteblock",

explodeblock: "explodeblock",
eb: "explodeblock",

purge: "purge",
pu: "purge",

layerisolate: "layerisolate",
layiso: "layerisolate",
li: "layerisolate",

layerunisolate: "layerunisolate",
layuniso: "layerunisolate",

layout: "layout",
lay: "layout",

layeroff: "layeroff",
layoff: "layeroff",

layeron: "layeron",
layon: "layeron",

layerfreeze: "layerfreeze",
layfreeze: "layerfreeze",

layerthaw: "layerthaw",
laythaw: "layerthaw",

layermatch: "layermatch",
lm: "layermatch",

layermerge: "layermerge",
laymerge: "layermerge",
lmrg: "layermerge",

matchprop: "matchprop",
ma: "matchprop",
mp: "matchprop",

overkill: "overkill",
ov: "overkill",

audit: "audit",
au: "audit",

regen: "regen",
re: "regen",

wipeout: "wipeout",
wo: "wipeout",

flatten: "flatten",
flat: "flatten",

list: "list",
li: "list",

xclip: "xclip",
xc: "xclip",

boundary: "boundary",
bo: "boundary",

divide: "divide",
div: "divide",

join: "join",
j: "join",
jn: "join",

union: "union",
uni: "union",

  erase: "erase",
e: "erase",
delete: "erase",
del: "erase",
};

if (
  command === "erase" ||
  command === "e" ||
  command === "er" ||
  command === "delete" ||
  command === "del"
) {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Pehle object select karo."
    );
    setCommandText("");
    return;
  }

  saveHistory(
    [...objects],
    [...measurements]
  );

  setObjects((prev) =>
    prev.filter(
      (_, index) =>
        !indexes.includes(index)
    )
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setCommandText("");
  setMobileCommandPanel("home");
  changeTool("select");

  return;
}

/* =========================
   SELECT ALL
========================= */

if (
  command === "all" ||
  command === "selectall"
) {
  const allIndexes = objects.map(
    (_, index) => index
  );

  if (allIndexes.length === 0) {
    setSelectedIndex(null);
    setSelectedIndexes([]);
    setCommandText("");
    return;
  }

  changeTool("select");

  setSelectedIndexes(
    allIndexes
  );

  setSelectedIndex(
    allIndexes[
      allIndexes.length - 1
    ]
  );

  setCommandText("");
  setMobileCommandPanel("home");

  return;
}

/* =========================
   SELECT LAST OBJECT
========================= */

if (
  command === "last" ||
  command === "selectlast"
) {
  if (objects.length === 0) {
    setSelectedIndex(null);
    setSelectedIndexes([]);
    setCommandText("");
    return;
  }

  const lastIndex =
    objects.length - 1;

  changeTool("select");

  setSelectedIndexes([
    lastIndex,
  ]);

  setSelectedIndex(
    lastIndex
  );

  setCommandText("");
  setMobileCommandPanel("home");

  return;
}

/* =========================
   DESELECT ALL
========================= */

if (
  command === "none" ||
  command === "deselect" ||
  command === "unselect"
) {
  setSelectedIndex(null);
  setSelectedIndexes([]);

  setCommandText("");
  setMobileCommandPanel("home");

  return;
}

  const selectedTool =
    toolMap[command];

  if (!selectedTool) {
    window.alert(
      `Unknown command: ${rawCommand}`
    );
    return;
  }

  setCommandText("");

  selectMobileTool(
    selectedTool
  );
};

/* =========================
   MOBILE LINE / POLYLINE UNDO
========================= */

const undoActiveLineSegment = () => {
  if (
    (tool !== "line" && tool !== "polyline") ||
    !lineStart ||
    showLineInput
  ) {
    return false;
  }

  const lastObject = objects[objects.length - 1];

  if (
    !lastObject ||
    !Array.isArray(lastObject.points) ||
    lastObject.points.length < 4
  ) {
    return false;
  }

  if (
    tool === "line" &&
    lastObject.type !== "line"
  ) {
    return false;
  }

  if (
    tool === "polyline" &&
    lastObject.type !== "polyline"
  ) {
    return false;
  }

  let nextStart;

  /* =========================
     POLYLINE: REMOVE LAST SEGMENT
  ========================= */

  if (tool === "polyline") {
    const points = lastObject.points;

    if (points.length < 6) {
      return false;
    }

    const updatedPoints = points.slice(0, -2);

    saveHistory([...objects], [...measurements]);

    setObjects((prev) => {
      const updated = [...prev];
      const index = updated.length - 1;

      if (
        !updated[index] ||
        updated[index].type !== "polyline"
      ) {
        return prev;
      }

      updated[index] = {
        ...updated[index],
        points: updatedPoints,
        closed: false,
      };

      return updated;
    });

    nextStart = {
      x: updatedPoints[updatedPoints.length - 2],
      y: updatedPoints[updatedPoints.length - 1],
    };
  }

  /* =========================
     LINE: UNDO LAST LINE
  ========================= */

  else {
    const previousObjects = objects.slice(0, -1);

    const previousLine = [...previousObjects]
      .reverse()
      .find(
        (object) =>
          object?.type === "line" &&
          Array.isArray(object.points) &&
          object.points.length >= 4
      );

    nextStart = previousLine
      ? {
          x: previousLine.points[
            previousLine.points.length - 2
          ],
          y: previousLine.points[
            previousLine.points.length - 1
          ],
        }
      : {
          x: lastObject.points[0],
          y: lastObject.points[1],
        };

    undo();
  }

  /* =========================
     CONTINUE DRAWING
  ========================= */

  setLineStart(nextStart);

  setLinePreview({
    x1: nextStart.x,
    y1: nextStart.y,
    x2: nextStart.x,
    y2: nextStart.y,
  });

  setPendingLinePoint(null);
  setLineLengthInput("");
  setShowLineInput(false);
  setSnapPoint(null);
  setSnapType("");
  setIsDrawing(true);

  return true;
};

/* =========================
   CLOSE ACTIVE POLYLINE
========================= */

const closeActivePolyline = () => {
  const lastObject = objects[objects.length - 1];

  if (
    tool !== "polyline" ||
    !lastObject ||
    lastObject.type !== "polyline" ||
    !Array.isArray(lastObject.points) ||
    lastObject.points.length < 6
  ) {
    return false;
  }

  const points = [...lastObject.points];

  const firstX = points[0];
  const firstY = points[1];

  const lastX = points[points.length - 2];
  const lastY = points[points.length - 1];

  const alreadyClosed =
    firstX === lastX && firstY === lastY;

  const closedPoints = alreadyClosed
    ? points
    : [...points, firstX, firstY];

  saveHistory([...objects], [...measurements]);

  setObjects((prev) => {
    const updated = [...prev];
    const index = updated.length - 1;

    if (
      !updated[index] ||
      updated[index].type !== "polyline"
    ) {
      return prev;
    }

    updated[index] = {
      ...updated[index],
      points: closedPoints,
      closed: true,
    };

    return updated;
  });

  setLineStart(null);
  setLinePreview(null);
  setPendingLinePoint(null);
  setLineLengthInput("");
  setShowLineInput(false);
  setIsDrawing(false);
  setSnapPoint(null);
  setSnapType("");
  actionStartRef.current = null;
  setCommandText("");
  setMobileCommandPanel("home");
  changeTool("select");

  return true;
};
 
  const [unit, setUnit] =
  useState("mm");

  const [clipboardObjects, setClipboardObjects] =
  useState([]);

  const [past, setPast] = useState([]);

  const [future, setFuture] = useState([]);

  const [splinePoints, setSplinePoints] =
  useState([]);

  const [splinePreviewPoint, setSplinePreviewPoint] =
  useState(null);

  const actionStartRef = useRef(null);

  const stageRef = useRef(null)

  const lastTouchTimeRef = useRef(0);
  
  const touchStateRef = useRef({
  lastDistance: null,
  lastCenter: null,
});

  const stretchStartRef = useRef(null);

  const panStartRef = useRef(null);

  const moveStartRef = useRef(null);

  /* =========================
   OFFSET TOUCH / DRAG STATE
========================= */

const offsetStartRef = useRef(null);

/* =========================
   OFFSET LIVE PREVIEW
========================= */

const [offsetPreview, setOffsetPreview] = useState(null);

  const copyStartRef = useRef(null);


  const GRID_SIZE = 25;

const snapToGrid = (value) => {
  return (
    Math.round(value / GRID_SIZE) *
    GRID_SIZE
  );
};

const getSnapType = (point) => {
  if (!point) {
    return "";
  }

  const tolerance = 0.5;

  const isNear = (a, b) => {
    return (
      Math.abs(a.x - b.x) <= tolerance &&
      Math.abs(a.y - b.y) <= tolerance
    );
  };

  for (const object of objects) {
    /* =========================
       LINE
    ========================= */
    if (
      object.type === "line" &&
      object.points?.length >= 4
    ) {
      const x1 = object.points[0];
      const y1 = object.points[1];

      const x2 = object.points[2];
      const y2 = object.points[3];

      const start = {
        x: x1,
        y: y1,
      };

      const end = {
        x: x2,
        y: y2,
      };

      const mid = {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
      };

      if (isNear(point, start)) {
        return "END";
      }

      if (isNear(point, end)) {
        return "END";
      }

      if (isNear(point, mid)) {
        return "MID";
      }
    }

    /* =========================
       POLYLINE
    ========================= */
    if (
      object.type === "polyline" &&
      object.points?.length >= 2
    ) {
      const points = object.points;

      for (
        let i = 0;
        i < points.length;
        i += 2
      ) {
        const vertex = {
          x: points[i],
          y: points[i + 1],
        };

        if (isNear(point, vertex)) {
          return "END";
        }
      }

      for (
        let i = 0;
        i < points.length - 2;
        i += 2
      ) {
        const mid = {
          x:
            (points[i] +
              points[i + 2]) /
            2,

          y:
            (points[i + 1] +
              points[i + 3]) /
            2,
        };

        if (isNear(point, mid)) {
          return "MID";
        }
      }
    }

    /* =========================
       CIRCLE
    ========================= */
    if (
      object.type === "circle" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.radius)
    ) {
      const center = {
        x: object.x,
        y: object.y,
      };

      const right = {
        x: object.x + object.radius,
        y: object.y,
      };

      const left = {
        x: object.x - object.radius,
        y: object.y,
      };

      const top = {
        x: object.x,
        y: object.y - object.radius,
      };

      const bottom = {
        x: object.x,
        y: object.y + object.radius,
      };

      if (isNear(point, center)) {
        return "CENTER";
      }

      if (
        isNear(point, right) ||
        isNear(point, left) ||
        isNear(point, top) ||
        isNear(point, bottom)
      ) {
        return "QUADRANT";
      }
    }
    
    /* =========================
   ELLIPSE SNAP TYPE
========================= */

if (
  object.type === "ellipse" &&
  Number.isFinite(object.x) &&
  Number.isFinite(object.y)
) {
  const rx = Math.abs(
    Number(object.radiusX) || 0
  );

  const ry = Math.abs(
    Number(object.radiusY) || 0
  );

  const angle =
    (Number(object.rotation) || 0) *
    (Math.PI / 180);

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const center = {
    x: object.x,
    y: object.y,
  };

  if (isNear(point, center)) {
    return "CENTER";
  }

  const axisPoints = [
    {
      x: object.x + rx * cos,
      y: object.y + rx * sin,
    },
    {
      x: object.x - rx * cos,
      y: object.y - rx * sin,
    },
    {
      x: object.x - ry * sin,
      y: object.y + ry * cos,
    },
    {
      x: object.x + ry * sin,
      y: object.y - ry * cos,
    },
  ];

  if (
    axisPoints.some(
      (axisPoint) => isNear(point, axisPoint)
    )
  ) {
    return "QUADRANT";
  }
}

    /* =========================
       RECTANGLE
    ========================= */
    if (
      object.type === "rectangle" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.width) &&
      Number.isFinite(object.height)
    ) {
      const left = object.x;
      const top = object.y;

      const right =
        object.x + object.width;

      const bottom =
        object.y + object.height;

      const midX =
        (left + right) / 2;

      const midY =
        (top + bottom) / 2;

      const corners = [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];

      for (const corner of corners) {
        if (isNear(point, corner)) {
          return "CORNER";
        }
      }

      const mids = [
        { x: midX, y: top },
        { x: midX, y: bottom },
        { x: left, y: midY },
        { x: right, y: midY },
      ];

      for (const mid of mids) {
        if (isNear(point, mid)) {
          return "MID";
        }
      }

      const center = {
        x: midX,
        y: midY,
      };

      if (isNear(point, center)) {
        return "CENTER";
      }
    }

        /* =========================
       HATCH
    ========================= */
    if (
      object.type === "hatch" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.width) &&
      Number.isFinite(object.height)
    ) {
      const left = Math.min(
        object.x,
        object.x + object.width
      );

      const right = Math.max(
        object.x,
        object.x + object.width
      );

      const top = Math.min(
        object.y,
        object.y + object.height
      );

      const bottom = Math.max(
        object.y,
        object.y + object.height
      );

      const midX =
        (left + right) / 2;

      const midY =
        (top + bottom) / 2;

      const corners = [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];

      for (const corner of corners) {
        if (isNear(point, corner)) {
          return "CORNER";
        }
      }

      const mids = [
        { x: midX, y: top },
        { x: midX, y: bottom },
        { x: left, y: midY },
        { x: right, y: midY },
      ];

      for (const mid of mids) {
        if (isNear(point, mid)) {
          return "MID";
        }
      }

      if (
        isNear(point, {
          x: midX,
          y: midY,
        })
      ) {
        return "CENTER";
      }
    }

    /* =========================
       ARC
    ========================= */
    if (
      object.type === "arc" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.radius) &&
      Number.isFinite(object.angleStart) &&
      Number.isFinite(object.angleEnd)
    ) {
      const center = {
        x: object.x,
        y: object.y,
      };

      const start = {
        x:
          object.x +
          object.radius *
            Math.cos(object.angleStart),

        y:
          object.y +
          object.radius *
            Math.sin(object.angleStart),
      };

      const end = {
        x:
          object.x +
          object.radius *
            Math.cos(object.angleEnd),

        y:
          object.y +
          object.radius *
            Math.sin(object.angleEnd),
      };

      const midAngle =
        (object.angleStart +
          object.angleEnd) /
        2;

      const mid = {
        x:
          object.x +
          object.radius *
            Math.cos(midAngle),

        y:
          object.y +
          object.radius *
            Math.sin(midAngle),
      };

      if (isNear(point, center)) {
        return "CENTER";
      }

      if (isNear(point, start)) {
        return "START";
      }

      if (isNear(point, end)) {
        return "END";
      }

      if (isNear(point, mid)) {
        return "MID";
      }
    }

    /* =========================
       TEXT
    ========================= */
    if (
      object.type === "text" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y)
    ) {
      const insertion = {
        x: object.x,
        y: object.y,
      };

      if (isNear(point, insertion)) {
        return "INSERT";
      }
    }
  }

 return "";
};

const snapToObject = (
  x,
  y
) => {

  if (
    !objectSnapEnabled &&
    gridSnapEnabled
  ) {
    setSnapPoint(null);

    return {
      x: snapToGrid(x),
      y: snapToGrid(y),
    };
  }

 const snapDistance =
  30 /
  Math.max(
    scale,
    0.2
  );
  const snapPoints = [];

 getVisibleObjectsForSnap().forEach((object) => {

    /* =========================
       LINE
    ========================= */

    if (
      object.type === "line" &&
      object.points?.length >= 4
    ) {
      const x1 = object.points[0];
      const y1 = object.points[1];

      const x2 = object.points[2];
      const y2 = object.points[3];

      /* Start point */
      snapPoints.push({
        x: x1,
        y: y1,
      });

      /* End point */
      snapPoints.push({
        x: x2,
        y: y2,
      });

      /* Midpoint */
      snapPoints.push({
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
      });
    }

    /* =========================
       POLYLINE
    ========================= */

    if (
      object.type === "polyline" &&
      object.points?.length >= 2
    ) {
      const points =
        object.points;

      /* Vertices */
      for (
        let i = 0;
        i < points.length;
        i += 2
      ) {
        const px = points[i];
        const py = points[i + 1];

        if (
          Number.isFinite(px) &&
          Number.isFinite(py)
        ) {
       snapPoints.push({
  x: px,
  y: py,
  snapType:
    i === 0
      ? "START"
      : i === points.length - 2
        ? "END"
        : "CORNER",
});
        }
      }

      /* Segment midpoints */
      for (
        let i = 0;
        i < points.length - 2;
        i += 2
      ) {
        const x1 = points[i];
        const y1 = points[i + 1];

        const x2 = points[i + 2];
        const y2 = points[i + 3];

        if (
          Number.isFinite(x1) &&
          Number.isFinite(y1) &&
          Number.isFinite(x2) &&
          Number.isFinite(y2)
        ) {
          snapPoints.push({
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2,
          });
        }
      }
    }

    /* =========================
       CIRCLE
    ========================= */

    if (
      object.type === "circle" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.radius)
    ) {
      const cx = object.x;
      const cy = object.y;
      const r = object.radius;

      /* Center */
      snapPoints.push({
        x: cx,
        y: cy,
      });

      /* Right */
      snapPoints.push({
        x: cx + r,
        y: cy,
      });

      /* Left */
      snapPoints.push({
        x: cx - r,
        y: cy,
      });

      /* Top */
      snapPoints.push({
        x: cx,
        y: cy - r,
      });

      /* Bottom */
      snapPoints.push({
        x: cx,
        y: cy + r,
      });
    }

/* =========================
   ELLIPSE OBJECT SNAP
========================= */

if (
  object.type === "ellipse" &&
  Number.isFinite(object.x) &&
  Number.isFinite(object.y) &&
  Number.isFinite(object.radiusX) &&
  Number.isFinite(object.radiusY)
) {
  const cx = object.x;
  const cy = object.y;

  const rx = Math.abs(object.radiusX);
  const ry = Math.abs(object.radiusY);

  const rotation =
    (Number(object.rotation) || 0) *
    (Math.PI / 180);

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // CENTER SNAP
  snapPoints.push({
    x: cx,
    y: cy,
    snapType: "CENTER",
  });

  // FOUR ELLIPSE AXIS POINTS
  const axisPoints = [
    [rx, 0],
    [-rx, 0],
    [0, -ry],
    [0, ry],
  ];

  axisPoints.forEach(([localX, localY]) => {
    snapPoints.push({
      x:
        cx +
        localX * cos -
        localY * sin,

      y:
        cy +
        localX * sin +
        localY * cos,

      snapType: "QUADRANT",
    });
  });

  /* =========================
   ELLIPSE NEAREST SNAP
========================= */

const pointerDx = x - cx;
const pointerDy = y - cy;

// Pointer ko ellipse ke local coordinates mein badlo
const localX =
  pointerDx * cos +
  pointerDy * sin;

const localY =
  -pointerDx * sin +
  pointerDy * cos;

if (rx > 0 && ry > 0) {
  const angle = Math.atan2(
    localY / ry,
    localX / rx
  );

  const nearestLocalX =
    rx * Math.cos(angle);

  const nearestLocalY =
    ry * Math.sin(angle);

  snapPoints.push({
    x:
      cx +
      nearestLocalX * cos -
      nearestLocalY * sin,

    y:
      cy +
      nearestLocalX * sin +
      nearestLocalY * cos,

    snapType: "NEAREST",
  });
}
}

    /* =========================
       RECTANGLE
    ========================= */

    if (
      object.type === "rectangle" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.width) &&
      Number.isFinite(object.height)
    ) {
      const left = object.x;
      const top = object.y;

      const right =
        object.x +
        object.width;

      const bottom =
        object.y +
        object.height;

      const midX =
        (left + right) / 2;

      const midY =
        (top + bottom) / 2;

      /* Corners */

      snapPoints.push(
        {
          x: left,
          y: top,
        },
        {
          x: right,
          y: top,
        },
        {
          x: right,
          y: bottom,
        },
        {
          x: left,
          y: bottom,
        }
      );

      /* Top midpoint */

      snapPoints.push({
        x: midX,
        y: top,
      });

      /* Bottom midpoint */

      snapPoints.push({
        x: midX,
        y: bottom,
      });

      /* Left midpoint */

      snapPoints.push({
        x: left,
        y: midY,
      });

      /* Right midpoint */

      snapPoints.push({
        x: right,
        y: midY,
      });

      /* Center */

      snapPoints.push({
        x: midX,
        y: midY,
      });
    }

        /* =========================
       HATCH
    ========================= */

    if (
      object.type === "hatch" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.width) &&
      Number.isFinite(object.height)
    ) {
      const left = Math.min(
        object.x,
        object.x + object.width
      );

      const right = Math.max(
        object.x,
        object.x + object.width
      );

      const top = Math.min(
        object.y,
        object.y + object.height
      );

      const bottom = Math.max(
        object.y,
        object.y + object.height
      );

      const midX =
        (left + right) / 2;

      const midY =
        (top + bottom) / 2;

      /* CORNERS */
      snapPoints.push(
        {
          x: left,
          y: top,
          snapType: "CORNER",
        },
        {
          x: right,
          y: top,
          snapType: "CORNER",
        },
        {
          x: right,
          y: bottom,
          snapType: "CORNER",
        },
        {
          x: left,
          y: bottom,
          snapType: "CORNER",
        }
      );

      /* MID POINTS */
      snapPoints.push(
        {
          x: midX,
          y: top,
          snapType: "MID",
        },
        {
          x: midX,
          y: bottom,
          snapType: "MID",
        },
        {
          x: left,
          y: midY,
          snapType: "MID",
        },
        {
          x: right,
          y: midY,
          snapType: "MID",
        }
      );

      /* CENTER */
      snapPoints.push({
        x: midX,
        y: midY,
        snapType: "CENTER",
      });
    }

    /* =========================
       ARC
    ========================= */

    if (
  object.type === "arc" &&
  Number.isFinite(object.x) &&
  Number.isFinite(object.y) &&
  Number.isFinite(object.radius) &&
  Number.isFinite(object.angleStart) &&
  Number.isFinite(object.angleEnd)
) {
  const cx = object.x;
  const cy = object.y;
  const r = object.radius;

  /* CENTER */
  snapPoints.push({
    x: cx,
    y: cy,
  });

  /* START POINT */
  snapPoints.push({
    x:
      cx +
      r * Math.cos(object.angleStart),
    y:
      cy +
      r * Math.sin(object.angleStart),
  });

  /* END POINT */
  snapPoints.push({
    x:
      cx +
      r * Math.cos(object.angleEnd),
    y:
      cy +
      r * Math.sin(object.angleEnd),
  });

  /* MID POINT */

const midAngle =
  (
    object.angleStart +
    object.angleEnd
  ) / 2;

snapPoints.push({
  x:
    cx +
    r * Math.cos(midAngle),

  y:
    cy +
    r * Math.sin(midAngle),
});
}

/* =========================
   CIRCLE / ARC QUADRANT
========================= */

if (
  (object.type === "circle" ||
    object.type === "arc") &&
  Number.isFinite(object.x) &&
  Number.isFinite(object.y) &&
  Number.isFinite(object.radius)
) {
  const cx = object.x;
  const cy = object.y;
  const r = object.radius;

  const quadrantPoints = [
    {
      x: cx,
      y: cy - r,
    },
    {
      x: cx + r,
      y: cy,
    },
    {
      x: cx,
      y: cy + r,
    },
    {
      x: cx - r,
      y: cy,
    },
  ];

  quadrantPoints.forEach(
    (point) => {
      snapPoints.push(point);
    }
  );
}

    /* =========================
       TEXT
    ========================= */

    if (
      object.type === "text" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y)
    ) {
      snapPoints.push({
        x: object.x,
        y: object.y,
      });
    }
  });

  /* =========================
   INTERSECTION SNAP
========================= */

const getLineSegments = (
  object
) => {
  const segments = [];

objects.forEach((object, objectIndex) => {
  const objectSegments =
    getLineSegments(object);

  objectSegments.forEach((segment) => {
    segments.push({
      ...segment,
      objectIndex,
    });
  });

  /* ELLIPSE INTERSECTION SEGMENTS */

  if (
    object?.type === "ellipse" &&
    Number.isFinite(object.x) &&
    Number.isFinite(object.y)
  ) {
    const rx = Math.abs(
      Number(object.radiusX) || 0
    );

    const ry = Math.abs(
      Number(object.radiusY) || 0
    );

    if (rx > 0 && ry > 0) {
      const rotation =
        (Number(object.rotation) || 0) *
        (Math.PI / 180);

      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const steps = 72;

      const pointAt = (angle) => {
        const lx = rx * Math.cos(angle);
        const ly = ry * Math.sin(angle);

        return {
          x: object.x + lx * cos - ly * sin,
          y: object.y + lx * sin + ly * cos,
        };
      };

      for (let i = 0; i < steps; i++) {
        const p1 = pointAt(
          (i / steps) * Math.PI * 2
        );

        const p2 = pointAt(
          ((i + 1) / steps) * Math.PI * 2
        );

        segments.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          objectIndex,
        });
      }
    }
  }
});
}

/* =========================
   FIND BEST SNAP POINT
========================= */

const snapPriority = {
  END: 1,
  CORNER: 1,
  START: 1,
  INTERSECTION: 1,
  CENTER: 2,
  QUADRANT: 2,
  INSERT: 2,
  MID: 3,
};

let nearestPoint = null;
let nearestType = "";
let nearestDistance = snapDistance;
let nearestPriority = Infinity;

snapPoints.forEach((point) => {
  const distance = Math.hypot(
    point.x - x,
    point.y - y
  );

  if (distance > snapDistance) {
    return;
  }

 const type =
  point.snapType ||
  getSnapType(point) ||
  "";

  const priority =
    snapPriority[type] ?? 4;

  if (
    priority < nearestPriority ||
    (
      priority === nearestPriority &&
      distance < nearestDistance
    )
  ) {
    nearestPriority = priority;
    nearestDistance = distance;
    nearestPoint = point;
    nearestType = type;
  }
});

/* =========================
   SNAP FOUND
========================= */

if (nearestPoint) {
  setSnapType(nearestType);
  setSnapPoint(nearestPoint);

  return nearestPoint;
}

  /* =========================
     NO OBJECT SNAP
     FALLBACK TO GRID
  ========================= */

  setSnapPoint(null);

  return {
    x: snapToGrid(x),
    y: snapToGrid(y),
  };
};

const applyOrtho = (
  startX,
  startY,
  currentX,
  currentY
) => {
  if (!orthoEnabled) {
    return {
      x: currentX,
      y: currentY,
    };
  }

  const dx =
    currentX - startX;

  const dy =
    currentY - startY;

  if (
    Math.abs(dx) >=
    Math.abs(dy)
  ) {
    return {
      x: currentX,
      y: startY,
    };
  }

  return {
    x: startX,
    y: currentY,
  };
};

const applyPolar = (
  startX,
  startY,
  currentX,
  currentY
) => {
  if (!polarEnabled) {
    return {
      x: currentX,
      y: currentY,
    };
  }

  const dx =
    currentX - startX;

  const dy =
    currentY - startY;

  const distance =
    Math.sqrt(
      dx * dx +
      dy * dy
    );

  if (distance === 0) {
    return {
      x: startX,
      y: startY,
    };
  }

  const angle =
    Math.atan2(dy, dx);

 const step =
  (polarAngleStep * Math.PI) /
  180;

  const snappedAngle =
    Math.round(angle / step) *
    step;

  return {
    x:
      startX +
      Math.cos(snappedAngle) *
        distance,

    y:
      startY +
      Math.sin(snappedAngle) *
        distance,
  };
};
 
/* =========================
   HISTORY
========================= */

const saveHistory = (
  previousObjects,
  previousMeasurements
) => {
  const safeObjects =
    JSON.parse(
      JSON.stringify(
        previousObjects || []
      )
    );

  const safeMeasurements =
    JSON.parse(
      JSON.stringify(
        previousMeasurements || []
      )
    );

  setPast((prev) => [
    ...prev,
    {
      objects: safeObjects,
      measurements: safeMeasurements,
    },
  ]);

  setFuture([]);
};

const undo = () => {
  if (past.length === 0) {
    return;
  }

  const previousState =
    past[past.length - 1];

  const currentObjects =
    JSON.parse(
      JSON.stringify(
        objects
      )
    );

  const currentMeasurements =
    JSON.parse(
      JSON.stringify(
        measurements
      )
    );

  setFuture((prev) => [
    ...prev,
    {
      objects: currentObjects,
      measurements:
        currentMeasurements,
    },
  ]);

  setObjects(
    JSON.parse(
      JSON.stringify(
        previousState.objects
      )
    )
  );

  setMeasurements(
    JSON.parse(
      JSON.stringify(
        previousState.measurements
      )
    )
  );

  setPast((prev) =>
    prev.slice(0, -1)
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setSelectedMeasurementIndex(
    null
  );

  setCommandFirstIndex(null);
  setMeasureStart(null);
  setAnglePoints([]);
  setSnapPoint(null);

  actionStartRef.current =
    null;

  moveStartRef.current =
    null;

  stretchStartRef.current =
    null;
};


const redo = () => {
  if (future.length === 0) {
    return;
  }

  const nextState =
    future[future.length - 1];

  const currentObjects =
    JSON.parse(
      JSON.stringify(
        objects
      )
    );

  const currentMeasurements =
    JSON.parse(
      JSON.stringify(
        measurements
      )
    );

  setPast((prev) => [
    ...prev,
    {
      objects: currentObjects,
      measurements:
        currentMeasurements,
    },
  ]);

  setObjects(
    JSON.parse(
      JSON.stringify(
        nextState.objects
      )
    )
  );

  setMeasurements(
    JSON.parse(
      JSON.stringify(
        nextState.measurements
      )
    )
  );

  setFuture((prev) =>
    prev.slice(0, -1)
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setSelectedMeasurementIndex(
    null
  );

  setCommandFirstIndex(null);
  setMeasureStart(null);
  setAnglePoints([]);
  setSnapPoint(null);

  actionStartRef.current =
    null;

  moveStartRef.current =
    null;

  stretchStartRef.current =
    null;
};

const parseCadDistance = (valueText) => {
  const value = String(valueText ?? "")
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/^@/, "");

  if (!value) return null;

  /* CAD DISTANCE<ANGLE INPUT */

if (value.includes("<")) {
  const distancePart = value
    .split("<")[0]
    .trim();

  if (!distancePart) {
    return null;
  }

  return parseCadDistance(distancePart);
}

  /* FEET + INCHES: 5' 6" or 5ft 6in */
  const feetInchesMatch = value.match(
    /^(-)?\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*(?:(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")?)?$/
  );

  if (feetInchesMatch) {
    const sign = feetInchesMatch[1] ? -1 : 1;
    const feet = Number(feetInchesMatch[2]);
    const inches = Number(feetInchesMatch[3] || 0);

    return sign * (
      feet * 304.8 +
      inches * 25.4
    );
  }

  /* NUMBER WITH OPTIONAL UNIT */
  const match = value.match(
    /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(ft|feet|in|inch|inches|'|")?$/
  );

  if (!match) return null;

  let number = Number(match[1]);
  const suffix = match[2] || "";

  if (!Number.isFinite(number)) return null;

  /* EXPLICIT UNIT */
  if (
    suffix === "ft" ||
    suffix === "feet" ||
    suffix === "'"
  ) {
    return number * 304.8;
  }

  if (
    suffix === "in" ||
    suffix === "inch" ||
    suffix === "inches" ||
    suffix === '"'
  ) {
    return number * 25.4;
  }

  /* SELECTED UNIT */
  if (unit === "inch") {
    number *= 25.4;
  } else if (unit === "ft-in") {
    number *= 304.8;
  }

  return number;
};

const parseCadAngle = (valueText) => {
  const text = valueText
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/°/g, "")
    .replace(/deg/g, "");

  const parts = text.split("<");

  if (parts.length < 2) {
    return null;
  }

  const angle = parseFloat(parts[1]);

  if (!Number.isFinite(angle)) {
    return null;
  }

  const normalizedAngle =
    ((angle % 360) + 360) % 360;

  return normalizedAngle;
};


/* =========================
   CONFIRM LINE LENGTH
========================= */

const confirmLineInput = () => {
  if (
    !lineStart ||
    !pendingLinePoint
  ) {
    return;
  }

  const valueText =
  lineLengthInput.trim();

const length =
  parseCadDistance(valueText);
  
  if (
    !Number.isFinite(length) ||
    length <= 0
  ) {
    return;
  }

 const angleInput =
  parseCadAngle(valueText);

const dx =
  pendingLinePoint.x -
  lineStart.x;

const dy =
  pendingLinePoint.y -
  lineStart.y;

const currentLength =
  Math.hypot(dx, dy);

if (currentLength === 0) {
  return;
}

let finalX;
let finalY;

if (angleInput !== null) {
  const angleRadians =
    angleInput *
    (Math.PI / 180);

  finalX =
    lineStart.x +
    Math.cos(angleRadians) *
      length;

  finalY =
    lineStart.y +
    Math.sin(angleRadians) *
      length;
} else {
  const ux =
    dx / currentLength;

  const uy =
    dy / currentLength;

  finalX =
    lineStart.x +
    ux * length;

  finalY =
    lineStart.y +
    uy * length;
}
if (tool === "polyline") {
  const currentPolyline =
    objects[objects.length - 1];

  if (
    !currentPolyline ||
    currentPolyline.type !== "polyline" ||
    !Array.isArray(currentPolyline.points)
  ) {
    return;
  }

  saveHistory(
    [...objects],
    [...measurements]
  );

  setObjects((prev) => {
    const updated = [...prev];
    const index = updated.length - 1;
    const current = updated[index];

    if (
      !current ||
      current.type !== "polyline" ||
      !Array.isArray(current.points)
    ) {
      return prev;
    }

    updated[index] = {
      ...current,
      points: [
        ...current.points,
        finalX,
        finalY,
      ],
    };

    return updated;
  });

  setLineStart({
    x: finalX,
    y: finalY,
  });

  setCommandText("Tap");

  setPendingLinePoint(null);
  setLineLengthInput("");
  setShowLineInput(false);
  setLinePreview(null);
  setSnapPoint(null);
  setSnapType("");

  setIsDrawing(true);

  actionStartRef.current = null;

  if (
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }

  return;
}

  const newLine = {
    type: "line",
    points: [
      lineStart.x,
      lineStart.y,
      finalX,
      finalY,
    ],
    rotation: 0,
    color: "#ffffff",
    strokeWidth: 2,
    layerId: activeLayerId,
  };

  saveHistory(
    [...objects],
    [...measurements]
  );

  setObjects((prev) => [
    ...prev,
    newLine,
  ]);
 
  /* =========================
   CONTINUE LINE FROM ENDPOINT
========================= */

setLineStart({
  x: finalX,
  y: finalY,
});

setLinePreview({
  x1: finalX,
  y1: finalY,
  x2: finalX,
  y2: finalY,
});

setPendingLinePoint(null);
setLineLengthInput("");
setShowLineInput(false);

setIsDrawing(true);

setSnapPoint(null);
setSnapType("");

setCommandText("");

actionStartRef.current = null;

if (
  document.activeElement instanceof HTMLElement
) {
  document.activeElement.blur();
}

return;
}

/* =========================
   CHECK LAYER LOCK
========================= */

const isLayerLocked = (layerId) => {
  if (!layerId) {
    return false;
  }

  const layer = layers.find(
    (item) => item.id === layerId
  );

  if (!layer) {
    return false;
  }

  return Boolean(layer.locked);
};
  /* =========================
     MOUSE DOWN
  ========================= */

  const handleMouseDown = (e) => {
    /* =========================
   LOCK CANVAS DURING INPUT
========================= */

if (showLineInput) {
  return;
}
    console.log(
  "MOUSEDOWN:",
  tool,
  e.evt?.type
);

    // =========================
// DOUBLE CLICK = FINISH POLYLINE
// =========================
if (
  tool === "polyline" &&
  e.evt?.type === "dblclick"
) {
  finishPolyline();
  return;
}

    if (
  e.evt?.type === "mousedown" &&
  Date.now() - lastTouchTimeRef.current < 500
) {
  return;
}

/* =========================
   QUICK MEASURE CLICK GUARD
========================= */

if (tool === "quickMeasure") {
  const stage = e.target.getStage();

  if (!stage) {
    return;
  }

  stage.setPointersPositions(e.evt);

  const pointer = stage.getPointerPosition();

  if (!pointer) {
    return;
  }

    setMousePosition({
    x: (pointer.x - position.x) / scale,
    y: (pointer.y - position.y) / scale,
  });

  return;
}

const objectCreationTools = [
  "line",
  "circle",
  "rectangle",
  "polyline",
  "arc",
  "text",
  "hatch",
];

if (
  objectCreationTools.includes(tool) &&
  isLayerLocked(activeLayerId)
) {
  window.alert(
    "Current layer is locked."
  );
  return;
}
 
    /* =========================
   ARC
   1 = CENTER
   2 = START POINT
   3 = END POINT
========================= */

if (tool === "arc") {

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

  const snapped =
    snapToObject(
      rawX,
      rawY
    );

  const point = {
    x: snapped.x,
    y: snapped.y,
  };

  /* =========================
     CENTER
  ========================= */

  if (
    arcPoints.length === 0
  ) {
    actionStartRef.current = {
      objects: [...objects],
      measurements: [...measurements],
    };

    setArcPoints([
      point,
    ]);

    setIsDrawing(true);
setSnapType("");
setSnapPoint(null);

    return;
  }

  /* =========================
     START
  ========================= */

  if (
    arcPoints.length === 1
  ) {
    setArcPoints([
      arcPoints[0],
      point,
    ]);

    return;
  }

  /* =========================
     END
  ========================= */

  if (
    arcPoints.length === 2
  ) {

    const center =
      arcPoints[0];

    const start =
      arcPoints[1];

    const end =
      point;

    const radius =
      Math.hypot(
        start.x - center.x,
        start.y - center.y
      );

    if (
      radius < 5
    ) {
      return;
    }

    const startAngle =
      Math.atan2(
        start.y - center.y,
        start.x - center.x
      );

    let endAngle =
      Math.atan2(
        end.y - center.y,
        end.x - center.x
      );

    let sweep =
      endAngle -
      startAngle;

    while (
      sweep < 0
    ) {
      sweep +=
        Math.PI * 2;
    }

    if (
      sweep < 0.0001
    ) {
      return;
    }

    endAngle =
      startAngle +
      sweep;

    const newArc = {
      type: "arc",

      x: center.x,
      y: center.y,

      radius,

      angleStart:
        startAngle,

      angleEnd:
        endAngle,

      rotation: 0,

      color: "#ffffff",

      strokeWidth: 2,

      layerId:
        activeLayerId,
    };

    const previousObjects =
      [...objects];

    const updatedObjects =
      [
        ...objects,
        newArc,
      ];

    setObjects(
      updatedObjects
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    const newIndex =
      updatedObjects.length - 1;

    setSelectedIndex(
      newIndex
    );

    setSelectedIndexes([
      newIndex,
    ]);

    /*
      IMPORTANT:
      Arc complete hone ke baad
      next Arc ke liye points reset.
    */

    setArcPoints([]);

    setIsDrawing(false);

    setSnapPoint(null);

    actionStartRef.current =
      null;

    return;
  }
}
     /* =========================
       SELECT OBJECT FROM CANVAS
    ========================= */

if (tool === "select") {
  const target = e.target;
  const objectId = target?.id?.();

  /* OBJECT CLICK */
  if (
    objectId &&
    objectId.startsWith("object-")
  ) {
    const clickedIndex = Number(
      objectId.replace(
        "object-",
        ""
      )
    );

    const multiSelect =
      e.evt?.shiftKey ||
      e.evt?.ctrlKey ||
      e.evt?.metaKey;

    if (multiSelect) {
      setSelectedIndexes((prev) => {
        if (
          prev.includes(clickedIndex)
        ) {
          return prev.filter(
            (item) =>
              item !== clickedIndex
          );
        }

        return [
          ...prev,
          clickedIndex,
        ];
      });

      setSelectedIndex(clickedIndex);
    } else {
      setSelectedIndexes([
        clickedIndex,
      ]);

      setSelectedIndex(clickedIndex);
    }

    e.cancelBubble = true;
    return;
  }

  /* BLANK CANVAS → PAN */

const stage =
  e.target.getStage();

if (!stage) return;

const pointer =
  stage.getPointerPosition();

if (!pointer) return;

/* SHIFT + DRAG = SELECTION BOX */
if (e.evt?.shiftKey) {
  const startX =
    (pointer.x - position.x) /
    scale;

  const startY =
    (pointer.y - position.y) /
    scale;

  setSelectionBox({
    x: startX,
    y: startY,
    width: 0,
    height: 0,
  });

  setIsSelecting(true);

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setSelectedMeasurementIndex(null);

  e.cancelBubble = true;
  return;
}

/* NORMAL DRAG = PAN */

const clientX =
  e.evt?.touches?.[0]?.clientX ??
  e.evt?.clientX;

const clientY =
  e.evt?.touches?.[0]?.clientY ??
  e.evt?.clientY;

if (
  Number.isFinite(clientX) &&
  Number.isFinite(clientY)
) {
  panStartRef.current = {
    mouseX: clientX,
    mouseY: clientY,
    positionX: position.x,
    positionY: position.y,
  };

  setIsPanning(true);
}

setSelectedIndex(null);
setSelectedIndexes([]);
setSelectedMeasurementIndex(null);

e.cancelBubble = true;
return;
}
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

/* =========================
   SPLINE PREVIEW
========================= */

if (
  tool === "spline" &&
  splinePoints.length >= 2
) {
  setSplinePreviewPoint({
    x: mousePosition.x,
    y: mousePosition.y,
  });
}


const snappedPoint =
  snapToObject(
    rawX,
    rawY
  );

const x =
  snappedPoint.x;

const y =
  snappedPoint.y;
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
      tool === "break" ||
      tool === "join"
    ) {
      return;
    }

    /* =========================
   VOLUME MEASUREMENT
   2D AREA × DEPTH
========================= */

if (tool === "volume") {
  const isInsideShape = (obj) => {
    if (!obj) return false;

       /* RECTANGLE / HATCH HIT TEST */

    if (
      obj.type === "rectangle" ||
      obj.type === "hatch"
    ) {
      const width = Number(obj.width);
      const height = Number(obj.height);

      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        return false;
      }

      const rotation =
        (Number(obj.rotation) || 0) *
        Math.PI / 180;

      const dx =
        x - (Number(obj.x) || 0);

      const dy =
        y - (Number(obj.y) || 0);

      const localX =
        dx * Math.cos(rotation) +
        dy * Math.sin(rotation);

      const localY =
        -dx * Math.sin(rotation) +
        dy * Math.cos(rotation);

      const hitTolerance = Math.max(
        0.5,
        4 / Math.max(scale, 0.01)
      );

      return (
        localX >= Math.min(0, width) - hitTolerance &&
        localX <= Math.max(0, width) + hitTolerance &&
        localY >= Math.min(0, height) - hitTolerance &&
        localY <= Math.max(0, height) + hitTolerance
      );
    }

       /* CIRCLE HIT TEST */

    if (obj.type === "circle") {
      const radius = Number(obj.radius);

      if (
        !Number.isFinite(radius) ||
        radius <= 0
      ) {
        return false;
      }

      const centerX = Number(obj.x) || 0;
      const centerY = Number(obj.y) || 0;

      const hitTolerance = Math.max(
        0.5,
        4 / Math.max(scale, 0.01)
      );

      return (
        Math.hypot(
          x - centerX,
          y - centerY
        ) <= radius + hitTolerance
      );
    }

       /* ELLIPSE HIT TEST */

    if (obj.type === "ellipse") {
      const radiusX = Number(obj.radiusX);
      const radiusY = Number(obj.radiusY);

      if (
        !Number.isFinite(radiusX) ||
        !Number.isFinite(radiusY) ||
        radiusX <= 0 ||
        radiusY <= 0
      ) {
        return false;
      }

      const rotation =
        (Number(obj.rotation) || 0) *
        Math.PI / 180;

      const dx =
        x - (Number(obj.x) || 0);

      const dy =
        y - (Number(obj.y) || 0);

      const localX =
        dx * Math.cos(rotation) +
        dy * Math.sin(rotation);

      const localY =
        -dx * Math.sin(rotation) +
        dy * Math.cos(rotation);

      const hitTolerance = Math.max(
        0.5,
        4 / Math.max(scale, 0.01)
      );

      const expandedRadiusX =
        radiusX + hitTolerance;

      const expandedRadiusY =
        radiusY + hitTolerance;

      return (
        (localX * localX) /
          (expandedRadiusX * expandedRadiusX) +
        (localY * localY) /
          (expandedRadiusY * expandedRadiusY)
      ) <= 1;
    }

         /* CLOSED POLYLINE HIT TEST */

    if (
      obj.type === "polyline" &&
      Array.isArray(obj.points) &&
      obj.points.length >= 6 &&
      obj.points.length % 2 === 0
    ) {
      const points = [];

      for (
        let i = 0;
        i < obj.points.length;
        i += 2
      ) {
        const px = Number(obj.points[i]);
        const py = Number(obj.points[i + 1]);

        if (
          !Number.isFinite(px) ||
          !Number.isFinite(py)
        ) {
          return false;
        }

        points.push({
          x: px,
          y: py,
        });
      }

      if (points.length < 3) {
        return false;
      }

      const first = points[0];
      const last = points[points.length - 1];

      const closingDistance = Math.hypot(
        first.x - last.x,
        first.y - last.y
      );

    /* REMOVE DUPLICATE CLOSING VERTEX */

if (closingDistance <= 0.5) {
  points.pop();
}

      if (points.length < 3) {
        return false;
      }

  /* HANDLE POLYLINE ROTATION */

const testX = x;
const testY = y;

const hitTolerance = Math.max(
  0.5,
  4 / Math.max(scale, 0.01)
);

      let inside = false;

      for (
        let i = 0, j = points.length - 1;
        i < points.length;
        j = i++
      ) {
        const a = points[i];
        const b = points[j];

        /* EDGE CLICK DETECTION */

        const edgeDX = b.x - a.x;
        const edgeDY = b.y - a.y;

        const edgeLengthSq =
          edgeDX * edgeDX +
          edgeDY * edgeDY;

        if (edgeLengthSq > 0) {
          const t = Math.max(
            0,
            Math.min(
              1,
              (
                (testX - a.x) * edgeDX +
                (testY - a.y) * edgeDY
              ) / edgeLengthSq
            )
          );

          const nearestX =
            a.x + t * edgeDX;

          const nearestY =
            a.y + t * edgeDY;

          if (
            Math.hypot(
              testX - nearestX,
              testY - nearestY
            ) <= hitTolerance
          ) {
            return true;
          }
        }

        /* POINT INSIDE POLYGON */

        if (
          (a.y > testY) !== (b.y > testY) &&
          testX <
            ((b.x - a.x) * (testY - a.y)) /
              (b.y - a.y) +
              a.x
        ) {
          inside = !inside;
        }
      }

      return inside;
    }

    return false;
  };

  const shapeEntry = objects
  .map((obj, index) => ({
    obj,
    index,
  }))
  .reverse()
  .find(({ obj, index }) => {
    if (
      !obj ||
      obj.hidden ||
      isObjectLocked(index)
    ) {
      return false;
    }

    const objectLayer = layers.find(
      (layer) =>
        layer.id ===
        (obj.layerId || "layer-0")
    );

    if (
      objectLayer &&
      !objectLayer.visible
    ) {
      return false;
    }

    return isInsideShape(obj);
  });

const shape = shapeEntry?.obj;

  if (!shape) {
    window.alert(
      "Click inside a rectangle, circle, ellipse, hatch, or closed polyline."
    );
    return;
  }

  let area = 0;

  if (
    shape.type === "rectangle" ||
    shape.type === "hatch"
  ) {
    area =
      Math.abs(shape.width) *
      Math.abs(shape.height);
  } else if (shape.type === "circle") {
    area =
      Math.PI *
      shape.radius *
      shape.radius;
  } else if (shape.type === "ellipse") {
    area =
      Math.PI *
      shape.radiusX *
      shape.radiusY;
  } else if (shape.type === "polyline") {
    const rawPoints = shape.points;

    if (
      !Array.isArray(rawPoints) ||
      rawPoints.length < 6 ||
      rawPoints.length % 2 !== 0
    ) {
      window.alert("Invalid closed polyline.");
      return;
    }

    const points = [];

    for (
      let i = 0;
      i < rawPoints.length;
      i += 2
    ) {
      const px = Number(rawPoints[i]);
      const py = Number(rawPoints[i + 1]);

      if (
        !Number.isFinite(px) ||
        !Number.isFinite(py)
      ) {
        window.alert(
          "Invalid polyline coordinates."
        );
        return;
      }

      points.push({ x: px, y: py });
    }

    if (points.length < 3) {
      window.alert(
        "Polyline needs at least 3 vertices."
      );
      return;
    }

    const first = points[0];
    const last = points[points.length - 1];

    const closingDistance = Math.hypot(
      first.x - last.x,
      first.y - last.y
    );

    const isClosed =
      shape.closed === true ||
      shape.isClosed === true ||
      closingDistance <= 0.5;

    if (!isClosed) {
      window.alert(
        "Polyline must be closed to calculate volume."
      );
      return;
    }

    if (closingDistance <= 0.5) {
      points.pop();
    }

    if (points.length < 3) {
      window.alert(
        "Polyline needs at least 3 vertices."
      );
      return;
    }

    let sum = 0;

    for (let i = 0; i < points.length; i++) {
      const next =
        points[(i + 1) % points.length];

      sum +=
        points[i].x * next.y -
        next.x * points[i].y;
    }

    area = Math.abs(sum) / 2;
  }

    /* =========================
     VALIDATE CALCULATED AREA
  ========================= */

  if (
    !Number.isFinite(area) ||
    area <= 0
  ) {
    window.alert(
      "Could not calculate a valid area. Select a valid closed shape."
    );
    return;
  }

  /* =========================
     DEPTH INPUT + VOLUME RESULT
  ========================= */

  const unitFactor =
    unit === "inch"
      ? 25.4
      : unit === "ft-in"
        ? 304.8
        : 1;

  const lengthUnit =
    unit === "inch"
      ? "in"
      : unit === "ft-in"
        ? "ft (decimal)"
        : "mm";

  const areaUnit =
    unit === "inch"
      ? "in²"
      : unit === "ft-in"
        ? "ft²"
        : "mm²";

  const volumeUnit =
    unit === "inch"
      ? "in³"
      : unit === "ft-in"
        ? "ft³"
        : "mm³";

  const depthText = window.prompt(
    `Enter extrusion depth (${lengthUnit}):`,
    "10"
  );

  if (depthText === null) {
    return;
  }

    const depth = parseCadDistance(depthText);

  if (
    !Number.isFinite(depth) ||
    depth <= 0
  ) {
    window.alert(
      "Enter a valid positive depth, e.g. 10, 10 in, or 5' 6\"."
    );
    return;
  }

  const volume = area * depth;

    /* VALIDATE FINAL VOLUME */

  if (
    !Number.isFinite(volume) ||
    volume <= 0
  ) {
    window.alert(
      "Volume calculation failed. Check the shape and depth."
    );
    return;
  }

  const displayArea =
    area / (unitFactor * unitFactor);

    const displayDepthText =
    unit === "ft-in"
      ? (() => {
          const sign =
            depth < 0 ? "-" : "";

          const totalInches =
            Math.abs(depth) / 25.4;

          let feet =
            Math.floor(totalInches / 12);

          let inches = Number(
            (totalInches - feet * 12).toFixed(2)
          );

          if (inches >= 12) {
            feet += 1;
            inches = 0;
          }

          return (
            `${sign}${feet}'-${inches.toFixed(2)}"`
          );
        })()
      : `${(depth / unitFactor).toFixed(2)} ${lengthUnit}`;

  const displayVolume =
    volume /
    (unitFactor * unitFactor * unitFactor);

  window.alert(
    `Area: ${displayArea.toFixed(2)} ${areaUnit}\n` +
   `Depth: ${displayDepthText}\n` +
    `Volume: ${displayVolume.toFixed(2)} ${volumeUnit}`
  );

  return;
}
    /* =========================
   AREA MEASUREMENT
========================= */

if (tool === "area") {
  const getPolygonVertices = (obj) => {
    if (
      obj?.type !== "polyline" ||
      !Array.isArray(obj.points) ||
      obj.points.length < 6
    ) {
      return null;
    }

    const vertices = [];

    for (
      let i = 0;
      i < obj.points.length - 1;
      i += 2
    ) {
      vertices.push({
        x: obj.points[i],
        y: obj.points[i + 1],
      });
    }

    if (vertices.length < 3) {
      return null;
    }

    const first = vertices[0];
    const last = vertices[vertices.length - 1];

    const isClosed =
      obj.closed === true ||
      Math.hypot(
        first.x - last.x,
        first.y - last.y
      ) < 0.000001;

    if (!isClosed) {
      return null;
    }

    if (
      Math.hypot(
        first.x - last.x,
        first.y - last.y
      ) < 0.000001
    ) {
      vertices.pop();
    }

    return vertices.length >= 3
      ? vertices
      : null;
  };

  const pointInPolygon = (px, py, vertices) => {
    let inside = false;

    for (
      let i = 0, j = vertices.length - 1;
      i < vertices.length;
      j = i++
    ) {
      const a = vertices[i];
      const b = vertices[j];

      const crosses =
        (a.y > py) !== (b.y > py) &&
        px <
          ((b.x - a.x) * (py - a.y)) /
            (b.y - a.y) +
            a.x;

      if (crosses) {
        inside = !inside;
      }
    }

    return inside;
  };

  /* FIND CLOSED OBJECT UNDER CLICK */

  const areaEntry = objects
  .map((obj, index) => ({
    obj,
    index,
  }))
  .reverse()
  .find(({ obj, index }) => {
    if (
      !obj ||
      obj.hidden ||
      isObjectLocked(index)
    ) {
      return false;
    }

    const objectLayer = layers.find(
      (layer) =>
        layer.id ===
        (obj.layerId || "layer-0")
    );

    if (
      objectLayer &&
      !objectLayer.visible
    ) {
      return false;
    }

      /* RECTANGLE / HATCH */

      if (
        obj.type === "rectangle" ||
        obj.type === "hatch"
      ) {
        const rotation =
          (Number(obj.rotation) || 0) *
          (Math.PI / 180);

        const dx = x - (Number(obj.x) || 0);
        const dy = y - (Number(obj.y) || 0);

        const localX =
          dx * Math.cos(rotation) +
          dy * Math.sin(rotation);

        const localY =
          -dx * Math.sin(rotation) +
          dy * Math.cos(rotation);

        const width = Number(obj.width) || 0;
        const height = Number(obj.height) || 0;

        return (
          localX >= Math.min(0, width) &&
          localX <= Math.max(0, width) &&
          localY >= Math.min(0, height) &&
          localY <= Math.max(0, height)
        );
      }

      /* CIRCLE */

      if (
        obj.type === "circle" &&
        Number(obj.radius) > 0
      ) {
        return (
          Math.hypot(
            x - obj.x,
            y - obj.y
          ) <= obj.radius
        );
      }

      /* ELLIPSE */

      if (
        obj.type === "ellipse" &&
        Number(obj.radiusX) > 0 &&
        Number(obj.radiusY) > 0
      ) {
        const rotation =
          (Number(obj.rotation) || 0) *
          (Math.PI / 180);

        const dx = x - obj.x;
        const dy = y - obj.y;

        const localX =
          dx * Math.cos(rotation) +
          dy * Math.sin(rotation);

        const localY =
          -dx * Math.sin(rotation) +
          dy * Math.cos(rotation);

        return (
          (localX * localX) /
            (obj.radiusX * obj.radiusX) +
          (localY * localY) /
            (obj.radiusY * obj.radiusY) <= 1
        );
      }

      /* CLOSED POLYLINE */

      if (obj.type === "polyline") {
        const vertices = getPolygonVertices(obj);

        return (
          vertices !== null &&
          pointInPolygon(x, y, vertices)
        );
      }

      return false;
    });

      const areaObject = areaEntry?.obj;

  if (!areaObject) {
    window.alert(
      "Click inside a rectangle, circle, ellipse, hatch, or closed polyline."
    );

    return;
  }

  let area = 0;

  if (
    areaObject.type === "rectangle" ||
    areaObject.type === "hatch"
  ) {
    area =
      Math.abs(areaObject.width) *
      Math.abs(areaObject.height);
  } else if (areaObject.type === "circle") {
    area =
      Math.PI *
      areaObject.radius *
      areaObject.radius;
  } else if (areaObject.type === "ellipse") {
    area =
      Math.PI *
      areaObject.radiusX *
      areaObject.radiusY;
  } else if (areaObject.type === "polyline") {
    const vertices =
      getPolygonVertices(areaObject);

    let sum = 0;

    for (
      let i = 0;
      i < vertices.length;
      i++
    ) {
      const next =
        vertices[(i + 1) % vertices.length];

      sum +=
        vertices[i].x * next.y -
        next.x * vertices[i].y;
    }

    area = Math.abs(sum) / 2;
  }

  const areaDisplay =
  unit === "inch"
    ? `${(area / (25.4 * 25.4)).toFixed(2)} inch²`
    : unit === "ft-in"
      ? `${(area / (304.8 * 304.8)).toFixed(2)} ft²`
      : `${area.toFixed(2)} mm²`;

window.alert(`Area = ${areaDisplay}`);

  return;
}

   if (tool === "text") {

  // Existing text par click ho to
  // naya text create mat karo.
  const target =
    e.target;

  if (
    target &&
    target.getClassName &&
    target.getClassName() ===
      "Text"
  ) {
    return;
  }

  const value =
    window.prompt(
      "Enter text:",
      "Text"
    );

  if (
    value === null ||
    value.trim() === ""
  ) {
    setIsDrawing(false);
    actionStartRef.current = null;
    return;
  }

  const newText = {
    type: "text",
    x,
    y,
    text: value,
    fontSize: 24,
    color: "#ffffff",
    rotation: 0,
    layerId: activeLayerId,
  };

  setObjects((prev) => [
    ...prev,
    newText,
  ]);

  setSelectedIndex(
    objects.length
  );

  setIsDrawing(false);

  if (actionStartRef.current) {
    saveHistory(
      actionStartRef.current.objects,
      actionStartRef.current.measurements
    );
  }

  actionStartRef.current = null;

  return;
}

if (tool === "polyline") {
  /* =========================
     FIRST CLICK
  ========================= */

  if (!lineStart) {
    actionStartRef.current = {
      objects: [...objects],
      measurements: [...measurements],
    };

    setObjects((prev) => [
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
    ]);

    setLineStart({
      x,
      y,
    });

    setIsDrawing(true);
    setLinePreview(null);

    return;
  }

  /* =========================
     CURRENT SEGMENT END
  ========================= */

  let finalX = x;
  let finalY = y;

  const dx =
    finalX - lineStart.x;

  const dy =
    finalY - lineStart.y;

  const distance =
    Math.hypot(dx, dy);

  /* =========================
     AUTO STRAIGHT LOCK
  ========================= */

  if (
    distance > 0 &&
    !orthoEnabled &&
    !polarEnabled
  ) {
    const angle =
      Math.atan2(dy, dx) *
      (180 / Math.PI);

    const normalizedAngle =
      (angle + 360) % 360;

    const horizontal =
      normalizedAngle <= 6 ||
      normalizedAngle >= 354 ||
      (
        normalizedAngle >= 174 &&
        normalizedAngle <= 186
      );

    const vertical =
      (
        normalizedAngle >= 84 &&
        normalizedAngle <= 96
      ) ||
      (
        normalizedAngle >= 264 &&
        normalizedAngle <= 276
      );

    if (horizontal) {
      finalY = lineStart.y;
    }

    if (vertical) {
      finalX = lineStart.x;
    }
  }

  /* =========================
     ORTHO
  ========================= */

  if (orthoEnabled) {
    const orthoPoint = applyOrtho(
      lineStart.x,
      lineStart.y,
      finalX,
      finalY
    );

    finalX = orthoPoint.x;
    finalY = orthoPoint.y;
  }

  /* =========================
     POLAR
  ========================= */

  if (polarEnabled) {
    const polarPoint = applyPolar(
      lineStart.x,
      lineStart.y,
      finalX,
      finalY
    );

    finalX = polarPoint.x;
    finalY = polarPoint.y;
  }

  /* =========================
     ADD NEW POLYLINE POINT
  ========================= */

  setObjects((prev) => {
    if (prev.length === 0) {
      return prev;
    }

    const updated = [...prev];
    const lastIndex =
      updated.length - 1;

    const lastObject =
      updated[lastIndex];

    if (
      !lastObject ||
      lastObject.type !== "polyline"
    ) {
      return prev;
    }

    updated[lastIndex] = {
      ...lastObject,
      points: [
        ...(lastObject.points || []),
        finalX,
        finalY,
      ],
    };

    return updated;
  });

  /* =========================
     NEXT SEGMENT STARTS HERE
  ========================= */

  setLineStart({
    x: finalX,
    y: finalY,
  });

  setLinePreview(null);
  setPendingLinePoint(null);
  setLineLengthInput("");
  setShowLineInput(false);
  setIsDrawing(true);

  return;
}

/* =========================
   DIAMETER DIMENSION
========================= */

if (tool === "diameterDimension") {
  let closestCircle = null;
let closestCircleIndex = -1;
let closestDistance = Infinity;
  objects.forEach((obj, objIndex) => {
   if (
  obj.type !== "circle" &&
  obj.type !== "arc"
) {
  return;
}

if (
  obj.type !== "circle" &&
  obj.type !== "arc"
) {
  return;
}

if (
  !Number.isFinite(obj.x) ||
  !Number.isFinite(obj.y) ||
  !Number.isFinite(obj.radius) ||
  obj.radius <= 0
) {
  return;
}

    const dx =
      x - obj.x;

    const dy =
      y - obj.y;

    const distanceFromCenter =
      Math.sqrt(
        dx * dx +
          dy * dy
      );

    const distanceFromCircle =
      Math.abs(
        distanceFromCenter -
          obj.radius
      );

    if (
      distanceFromCircle <
        closestDistance &&
      distanceFromCircle <= 15
    ) {
      closestDistance =
        distanceFromCircle;

      closestCircle = obj;
      closestCircleIndex = objIndex;
    }
  });

  if (!closestCircle) {
    window.alert(
      "Please click near a circle."
    );
    return;
  }

  const cx =
    closestCircle.x;

  const cy =
    closestCircle.y;

  const dx =
    x - cx;

  const dy =
    y - cy;

  const length =
    Math.sqrt(
      dx * dx +
        dy * dy
    );

  let ux = 1;
  let uy = 0;

  if (length > 0) {
    ux = dx / length;
    uy = dy / length;
  }

  const radius =
    closestCircle.radius;

  const point1 = {
    x:
      cx +
      ux * radius,
    y:
      cy +
      uy * radius,
  };

  const point2 = {
    x:
      cx -
      ux * radius,
    y:
      cy -
      uy * radius,
  };

  const newMeasurement = {
  x1: cx,
  y1: cy,
  x2: point1.x,
  y2: point1.y,
  x3: point2.x,
  y3: point2.y,
  diameter:
    Math.round(
      radius * 2 * 100
    ) / 100,
  objectIndex:
    closestCircleIndex,
  type:
    "diameterDimension",
};
  const previousObjects = [
    ...objects,
  ];

  const previousMeasurements = [
    ...measurements,
  ];

  const newIndex =
    measurements.length;

  setMeasurements((prev) => [
    ...prev,
    newMeasurement,
  ]);

  saveHistory(
    previousObjects,
    previousMeasurements
  );

  setSelectedMeasurementIndex(
    newIndex
  );

  actionStartRef.current =
    null;

  setSnapPoint(null);

  setMousePosition({
    x: 0,
    y: 0,
  });

  return;
}

/* =========================
   RADIUS DIMENSION
========================= */

if (tool === "radiusDimension") {
  let closestCircle = null;
let closestCircleIndex = -1;
let closestDistance = Infinity;

  objects.forEach((obj, objIndex) => {
    if (
      obj.type !== "circle" ||
      !Number.isFinite(obj.x) ||
      !Number.isFinite(obj.y) ||
      !Number.isFinite(obj.radius) ||
      obj.radius <= 0
    ) {
      return;
    }

    const dx = x - obj.x;
    const dy = y - obj.y;

    const distanceFromCenter =
      Math.sqrt(
        dx * dx + dy * dy
      );

    const distanceFromCircle =
      Math.abs(
        distanceFromCenter -
          obj.radius
      );

    if (
      distanceFromCircle <
        closestDistance &&
      distanceFromCircle <= 15
    ) {
      closestDistance =
        distanceFromCircle;

      closestCircle = obj;
      closestCircleIndex = objIndex;
    }
  });

  if (!closestCircle) {
    window.alert(
      "Please click near a circle."
    );
    return;
  }

  const cx =
    closestCircle.x;

  const cy =
    closestCircle.y;

  const dx =
    x - cx;

  const dy =
    y - cy;

  const length =
    Math.sqrt(
      dx * dx +
      dy * dy
    );

  let edgeX;
  let edgeY;

  if (length === 0) {
    edgeX =
      cx + closestCircle.radius;

    edgeY = cy;
  } else {
    edgeX =
      cx +
      (dx / length) *
        closestCircle.radius;

    edgeY =
      cy +
      (dy / length) *
        closestCircle.radius;
  }

  const newMeasurement = {
  x1: cx,
  y1: cy,
  x2: edgeX,
  y2: edgeY,
  radius:
    Math.round(
      closestCircle.radius *
        100
    ) / 100,
  objectIndex:
    closestCircleIndex,
  type:
    "radiusDimension",
};

  const previousObjects = [
    ...objects,
  ];

  const previousMeasurements = [
    ...measurements,
  ];

  const newIndex =
    measurements.length;

  setMeasurements((prev) => [
    ...prev,
    newMeasurement,
  ]);

  if (actionStartRef.current) {
    saveHistory(
      actionStartRef.current.objects,
      actionStartRef.current.measurements
    );
  } else {
    saveHistory(
      previousObjects,
      previousMeasurements
    );
  }

  setSelectedMeasurementIndex(
    newIndex
  );

  actionStartRef.current =
    null;

  setSnapPoint(null);

  setMousePosition({
    x: 0,
    y: 0,
  });

  return;
}


   
    /* =========================
       MEASURE
    ========================= */

    if (tool === "angularDimension") {
  const newPoints = [
    ...anglePoints,
    { x, y },
  ];

  if (newPoints.length < 3) {
  if (
    newPoints.length === 1 &&
    !actionStartRef.current
  ) {
    actionStartRef.current = {
      objects: [...objects],
      measurements: [...measurements],
    };
  }

  setAnglePoints(newPoints);
  return;
}

  const vertex = newPoints[0];
  const point1 = newPoints[1];
  const point2 = newPoints[2];

  const v1x = point1.x - vertex.x;
  const v1y = point1.y - vertex.y;

  const v2x = point2.x - vertex.x;
  const v2y = point2.y - vertex.y;

  const dot =
    v1x * v2x +
    v1y * v2y;

  const cross =
    v1x * v2y -
    v1y * v2x;

  let angle =
    Math.atan2(
      Math.abs(cross),
      dot
    ) *
    (180 / Math.PI);

  if (angle < 0) {
    angle += 360;
  }

  /* =========================
   FIND ASSOCIATED LINES
========================= */

const distanceToSegment = (
  px,
  py,
  x1,
  y1,
  x2,
  y2
) => {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const lengthSquared =
    dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(
      px - x1,
      py - y1
    );
  }

  let t =
    ((px - x1) * dx +
      (py - y1) * dy) /
    lengthSquared;

  t = Math.max(
    0,
    Math.min(1, t)
  );

  const closestX =
    x1 + t * dx;

  const closestY =
    y1 + t * dy;

  return Math.hypot(
    px - closestX,
    py - closestY
  );
};

let firstLineIndex = null;
let secondLineIndex = null;

let firstLineDistance =
  Infinity;

let secondLineDistance =
  Infinity;

objects.forEach(
  (object, objectIndex) => {
    if (
      object.type !== "line" ||
      !object.points ||
      object.points.length < 4
    ) {
      return;
    }

    const lineX1 =
      object.points[0];

    const lineY1 =
      object.points[1];

    const lineX2 =
      object.points[2];

    const lineY2 =
      object.points[3];

    const distance1 =
      distanceToSegment(
        point1.x,
        point1.y,
        lineX1,
        lineY1,
        lineX2,
        lineY2
      );

    const distance2 =
      distanceToSegment(
        point2.x,
        point2.y,
        lineX1,
        lineY1,
        lineX2,
        lineY2
      );

    if (
      distance1 <
        firstLineDistance &&
      distance1 <= 15
    ) {
      firstLineDistance =
        distance1;

      firstLineIndex =
        objectIndex;
    }

    if (
      distance2 <
        secondLineDistance &&
      distance2 <= 15
    ) {
      secondLineDistance =
        distance2;

      secondLineIndex =
        objectIndex;
    }
  }
);

  const newMeasurement = {
    x1: vertex.x,
    y1: vertex.y,
    x2: point1.x,
    y2: point1.y,
    x3: point2.x,
    y3: point2.y,
    angle: Math.round(angle * 100) / 100,
     objectIndex1:
    firstLineIndex,

  objectIndex2:
    secondLineIndex,

    type: "angularDimension",
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

setAnglePoints([]);

setSnapPoint(null);

setMousePosition({
  x: 0,
  y: 0,
});

return;
    }

    if (
  tool === "measure" ||
  tool === "dimension"
) {
  /* ONE CLICK: existing LINE measure */
  if (tool === "measure") {
    let nearestLine = null;
    let nearestDistance = Infinity;

    objects.forEach((object, index) => {
      if (
        object.type !== "line" ||
        object.points?.length < 4
      ) {
        return;
      }

      const x1 = object.points[0];
      const y1 = object.points[1];
      const x2 = object.points[2];
      const y2 = object.points[3];

      const dx = x2 - x1;
      const dy = y2 - y1;
      const lengthSquared =
        dx * dx + dy * dy;

      if (lengthSquared === 0) {
        return;
      }

      const t =
        Math.max(
          0,
          Math.min(
            1,
            (
              (x - x1) * dx +
              (y - y1) * dy
            ) /
              lengthSquared
          )
        );

      const px = x1 + t * dx;
      const py = y1 + t * dy;

      const distanceToLine =
        Math.hypot(
          x - px,
          y - py
        );

      if (
        distanceToLine < nearestDistance &&
        distanceToLine <= 25
      ) {
        nearestDistance =
          distanceToLine;

        nearestLine = {
          index,
          x1,
          y1,
          x2,
          y2,
          distance:
  Math.round(
    Math.hypot(dx, dy) * 100
  ) / 100,
        };
      }
    });

    if (nearestLine) {
      const newMeasurement = {
        x1: nearestLine.x1,
        y1: nearestLine.y1,
        x2: nearestLine.x2,
        y2: nearestLine.y2,
        distance:
          nearestLine.distance,
        objectIndex:
          nearestLine.index,
        type: "measure",
      };

      setMeasurements((prev) => [
        ...prev,
        newMeasurement,
      ]);

      return;
    }
  }

  /* =========================
   ELLIPSE PERIMETER MEASURE
========================= */

let nearestEllipse = null;
let nearestEllipseDistance = Infinity;

objects.forEach((object, index) => {
  if (
    object.type !== "ellipse" ||
    object.hidden ||
    isObjectLocked(index)
  ) {
    return;
  }

  const rx = Math.abs(Number(object.radiusX) || 0);
  const ry = Math.abs(Number(object.radiusY) || 0);

  if (rx <= 0 || ry <= 0) {
    return;
  }

  const rotation =
    (Number(object.rotation) || 0) *
    (Math.PI / 180);

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const pointAt = (angle) => {
    const lx = rx * Math.cos(angle);
    const ly = ry * Math.sin(angle);

    return {
      x: object.x + lx * cos - ly * sin,
      y: object.y + lx * sin + ly * cos,
    };
  };

  let distance = Infinity;
  const steps = 72;

  for (let i = 0; i < steps; i++) {
    const p1 = pointAt((i / steps) * Math.PI * 2);
    const p2 = pointAt(((i + 1) / steps) * Math.PI * 2);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const lengthSquared = dx * dx + dy * dy;

    const t = lengthSquared > 0
      ? Math.max(
          0,
          Math.min(
            1,
            ((x - p1.x) * dx + (y - p1.y) * dy) /
              lengthSquared
          )
        )
      : 0;

    distance = Math.min(
      distance,
      Math.hypot(
        x - (p1.x + t * dx),
        y - (p1.y + t * dy)
      )
    );
  }

  if (
    distance <= 25 &&
    distance < nearestEllipseDistance
  ) {
    nearestEllipseDistance = distance;
    nearestEllipse = { object, index };
  }
});

if (nearestEllipse) {
  const rx = Math.abs(
    Number(nearestEllipse.object.radiusX) || 0
  );

  const ry = Math.abs(
    Number(nearestEllipse.object.radiusY) || 0
  );

  // Ramanujan approximation of ellipse perimeter
  const a = Math.max(rx, ry);
  const b = Math.min(rx, ry);

  const h =
    ((a - b) / (a + b)) ** 2;

  const perimeter =
    Math.PI *
    (a + b) *
    (
      1 +
      (3 * h) /
        (10 + Math.sqrt(4 - 3 * h))
    );

  setSelectedIndex(nearestEllipse.index);

  setSelectedIndexes([
    nearestEllipse.index,
  ]);

  setCommandText(
    `Ellipse perimeter: ${perimeter.toFixed(2)} ${unit}`
  );

  return;
}

  /* TWO CLICK: free measurement */
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

  const distance =
    Math.sqrt(
      dx * dx +
      dy * dy
    );

  const newMeasurement = {
    x1: measureStart.x,
    y1: measureStart.y,
    x2: x,
    y2: y,
    distance:
      Math.round(distance),
    type:
      tool === "dimension"
        ? "dimension"
        : "measure",
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
   LINE — MOBILE
   TOUCH ONLY SETS CURSOR
   FIRST TAP WILL BE HANDLED
   BY THE MOBILE TAP BUTTON
========================= */

if (
  tool === "line" &&
  e.evt?.type?.startsWith("touch")
) {
  const stage =
    e.target.getStage();

  if (!stage) {
    return;
  }

  stage.setPointersPositions(
    e.evt
  );

  const pointer =
    stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  const rawX =
    (pointer.x - position.x) /
    scale;

  const rawY =
    (pointer.y - position.y) /
    scale;

  const snappedPoint =
    snapToObject(
      rawX,
      rawY
    );

  setMousePosition({
    x: snappedPoint.x,
    y: snappedPoint.y,
  });

  return;
}


/* =========================
   LINE
========================= */

if (tool === "line") {

  const stage =
    e.target.getStage();

  if (!stage) {
    return;
  }

  stage.setPointersPositions(e.evt);

  const pointer =
    stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  const rawX =
    (pointer.x - position.x) / scale;

  const rawY =
    (pointer.y - position.y) / scale;

  const snappedPoint =
    snapToObject(
      rawX,
      rawY
    );

  let finalX =
    snappedPoint.x;

  let finalY =
    snappedPoint.y;
  

  /* =========================
     FIRST CLICK
  ========================= */

  if (!lineStart) {

    actionStartRef.current = {
      objects: [...objects],
      measurements: [...measurements],
    };

    setLineStart({
      x,
      y,
    });

    setIsDrawing(true);
    setLinePreview(null);
    setPendingLinePoint(null);

    return;
  }

    /* =========================
     AUTO STRAIGHT LOCK
     FINAL LINE — ZOOM INDEPENDENT
  ========================= */

  if (
    !orthoEnabled &&
    !polarEnabled
  ) {
    const dx =
      finalX - lineStart.x;

    const dy =
      finalY - lineStart.y;

    const distance =
      Math.hypot(dx, dy);

    if (distance > 0) {
      const angle =
        Math.atan2(dy, dx) *
        (180 / Math.PI);

      const normalizedAngle =
        (angle + 360) % 360;

      const horizontal =
        normalizedAngle <= 6 ||
        normalizedAngle >= 354 ||
        (
          normalizedAngle >= 174 &&
          normalizedAngle <= 186
        );

      const vertical =
        (
          normalizedAngle >= 84 &&
          normalizedAngle <= 96
        ) ||
        (
          normalizedAngle >= 264 &&
          normalizedAngle <= 276
        );

      if (horizontal) {
        finalY = lineStart.y;
      }

      if (vertical) {
        finalX = lineStart.x;
      }
    }
  }


  /* =========================
     ORTHO
  ========================= */

  if (orthoEnabled) {

    const orthoPoint =
      applyOrtho(
        lineStart.x,
        lineStart.y,
        finalX,
        finalY
      );

    finalX =
      orthoPoint.x;

    finalY =
      orthoPoint.y;
  }


  /* =========================
     POLAR
  ========================= */

  if (polarEnabled) {

    const polarPoint =
      applyPolar(
        lineStart.x,
        lineStart.y,
        finalX,
        finalY
      );

    finalX =
      polarPoint.x;

    finalY =
      polarPoint.y;
  }


  /* =========================
     ZERO LENGTH
  ========================= */

  if (
    lineStart.x === finalX &&
    lineStart.y === finalY
  ) {
    return;
  }

    /* =========================
     ASK FOR LINE LENGTH
  ========================= */

  const requestedDistance = Math.hypot(
    finalX - lineStart.x,
    finalY - lineStart.y
  );

  if (
    !Number.isFinite(requestedDistance) ||
    requestedDistance <= 0
  ) {
    return;
  }

  let requestedAngle =
    Math.atan2(
      finalY - lineStart.y,
      finalX - lineStart.x
    ) * (180 / Math.PI);

  if (requestedAngle < 0) {
    requestedAngle += 360;
  }

  setPendingLinePoint({
    x: finalX,
    y: finalY,
  });

  setLineLengthInput(
    `${requestedDistance.toFixed(2)}<${requestedAngle.toFixed(1)}`
  );

  setShowLineInput(true);

  return;


  /* =========================
     CREATE LINE
  ========================= */

  const newLine = {

    type: "line",

    points: [
      lineStart.x,
      lineStart.y,
      finalX,
      finalY,
    ],

    rotation: 0,

    color: "#ffffff",

    strokeWidth: 2,

    layerId:
      activeLayerId,
  };


  /* =========================
     SAVE PREVIOUS STATE
  ========================= */

  const previousObjects =
    [...objects];

  const previousMeasurements =
    [...measurements];


  /* =========================
     ADD LINE
  ========================= */

  setObjects((prev) => [
    ...prev,
    newLine,
  ]);


  /* =========================
     HISTORY
  ========================= */

  saveHistory(
    previousObjects,
    previousMeasurements
  );


  /* =========================
     CONTINUE LINE
  ========================= */

  setLineStart({
    x: finalX,
    y: finalY,
  });

  setLinePreview(null);

  setPendingLinePoint(null);

  setLineLengthInput("");

  setShowLineInput(false);

  setIsDrawing(true);

  setSnapPoint(null);

  setSnapType("");

  actionStartRef.current =
    null;

  return;
}
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

    /* =========================
   ELLIPSE START
========================= */

if (tool === "ellipse") {
  setObjects((prev) => [
    ...prev,
    {
      type: "ellipse",
      x,
      y,
      radiusX: 0,
      radiusY: 0,
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

    /* =========================
   HATCH START
========================= */

if (tool === "hatch") {
  actionStartRef.current = {
    objects: [...objects],
    measurements: [...measurements],
  };

  setObjects((prev) => [
    ...prev,
    {
      type: "hatch",
      x,
      y,
      width: 0,
      height: 0,
      rotation: 0,
      color: "#ffffff",
      strokeWidth: 1,
      hatchColor: "#00aaff",
      hatchSpacing: 12,
      hatchAngle: 45,
      layerId: activeLayerId,
    },
  ]);

  return;
}

/* =========================
   HATCH PREVIEW / RESIZE
========================= */

if (tool === "hatch" && isDrawing) {
  setObjects((prev) => {
    if (prev.length === 0) {
      return prev;
    }

    const lastIndex = prev.length - 1;
    const hatch = prev[lastIndex];

    if (!hatch || hatch.type !== "hatch") {
      return prev;
    }

    const width = x - hatch.x;
    const height = y - hatch.y;

    return prev.map((object, index) =>
      index === lastIndex
        ? {
            ...object,
            width,
            height,
          }
        : object
    );
  });

  return;
}


/* =========================
   HATCH FINISH
========================= */

if (tool === "hatch") {
  const lastIndex = objects.length - 1;
  const hatch = objects[lastIndex];

  if (
    hatch &&
    hatch.type === "hatch"
  ) {
    if (
      Math.abs(hatch.width) < 5 ||
      Math.abs(hatch.height) < 5
    ) {
      setObjects((prev) =>
        prev.filter(
          (_, index) =>
            index !== lastIndex
        )
      );
    } else {
      setSelectedIndex(lastIndex);
      setSelectedIndexes([lastIndex]);

      saveHistory(
        actionStartRef.current?.objects ||
          objects,
        actionStartRef.current?.measurements ||
          measurements
      );
    }
  }

  setIsDrawing(false);
  return;
}


  /* =========================
     MOUSE MOVE
  ========================= */

  const handleMouseMove = (e) => {

    /* =========================
   FREEZE CANVAS DURING INPUT
========================= */

if (showLineInput) {
  return;
}

      /* =========================
     COPY = DRAG COPIED OBJECT
  ========================= */

  if (
    tool === "copy" &&
    copyStartRef.current
  ) {
    updateCopy(e);
    return;
  }
 if (
  e.evt?.buttons === 4 &&
  !isPanning
) {
  e.evt.preventDefault();

  panStartRef.current = {
    mouseX: e.evt.clientX,
    mouseY: e.evt.clientY,
    positionX: position.x,
    positionY: position.y,
  };

  setIsPanning(true);

  return;
}
    const stage =
      e.target.getStage();

    if (!stage) return;

    if (
  tool === "move" &&
  moveStartRef.current
) {
  updateMove(e);
  return;
}

/* =========================
   OFFSET = START DRAG
========================= */

if (
  tool === "offset" &&
  offsetStartRef.current
) {
  const offsetData =
    offsetStartRef.current;

  const pointer =
    stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  const currentX =
    (pointer.x - position.x) /
    scale;

  const currentY =
    (pointer.y - position.y) /
    scale;

  /* =========================
     SET START POINT
  ========================= */

  if (
    offsetData.startX === null ||
    offsetData.startY === null
  ) {
    offsetData.startX =
      currentX;

    offsetData.startY =
      currentY;
  }

  /* =========================
     OFFSET DELTA
  ========================= */

  const dx =
    currentX -
    offsetData.startX;

  const dy =
    currentY -
    offsetData.startY;

  const distance =
    Math.hypot(
      dx,
      dy
    );

  /* =========================
     OFFSET DIRECTION
  ========================= */

  let sign = 1;

  const original =
    objects[offsetData.index];

  if (
    original?.type === "line" &&
    original.points?.length >= 4
  ) {
    const x1 =
      original.points[0];

    const y1 =
      original.points[1];

    const x2 =
      original.points[2];

    const y2 =
      original.points[3];

    const lineDx =
      x2 - x1;

    const lineDy =
      y2 - y1;

    const cross =
      lineDx * dy -
      lineDy * dx;

    if (
      cross < 0
    ) {
      sign = -1;
    }
  }

  /* =========================
     SAVE OFFSET STATE
  ========================= */

  offsetData.moved =
    distance > 0;

  offsetData.currentX =
    currentX;

  offsetData.currentY =
    currentY;

  offsetData.dx =
    dx;

  offsetData.dy =
    dy;

  offsetData.distance =
    distance;

  offsetData.sign =
    sign;

  /* =========================
     LIVE OFFSET PREVIEW DATA
  ========================= */

  if (original) {
    setOffsetPreview({
      index:
        offsetData.index,

      dx,
      dy,

      distance,

      sign,
    });
  }

  return;
}

/* =========================
   PAN
========================= */

if (
  isPanning &&
  panStartRef.current
) {
  const pointer =
    stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  const dx =
    pointer.x -
    panStartRef.current.mouseX;

  const dy =
    pointer.y -
    panStartRef.current.mouseY;

  setPosition({
    x:
      panStartRef.current.positionX +
      dx,

    y:
      panStartRef.current.positionY +
      dy,
  });

  return;
}

/* =========================
   GET CURRENT POINTER
========================= */

const point =
  stage.getPointerPosition();

if (!point) {
  return;
}

const rawX =
  (point.x - position.x) /
  scale;

const rawY =
  (point.y - position.y) /
  scale;

setMousePosition({
  x:
    tool === "quickMeasure"
      ? rawX
      : Math.round(rawX),

  y:
    tool === "quickMeasure"
      ? rawY
      : Math.round(rawY),
});

/* =========================
   SELECTION BOX
========================= */

if (
  isSelecting &&
  selectionBox
) {
  setSelectionBox((prev) => {
    if (!prev) {
      return null;
    }

    return {
      ...prev,
      width:
        rawX - prev.x,
      height:
        rawY - prev.y,
    };
  });

  return;
}

const snappedPoint =
  snapToObject(
    rawX,
    rawY
  );

/* =========================
   LINE / POLYLINE LIVE PREVIEW
========================= */

if (
  (tool === "line" ||
    tool === "polyline") &&
  lineStart &&
  isDrawing &&
  !showLineInput
) {
  let previewX =
    snappedPoint.x;

  let previewY =
    snappedPoint.y;

  /* =========================
     ENDPOINT SNAP LOCK
  ========================= */

  if (
    tool === "line" &&
    snappedPoint
  ) {
    previewX =
      snappedPoint.x;

    previewY =
      snappedPoint.y;
  }

  const dx =
    previewX -
    lineStart.x;

  const dy =
    previewY -
    lineStart.y;

  const distance =
    Math.hypot(
      dx,
      dy
    );

  /* =========================
     AUTO STRAIGHT LOCK
     HORIZONTAL / VERTICAL
  ========================= */

  if (
    distance > 0 &&
    !orthoEnabled &&
    !polarEnabled
  ) {
    const angle =
      Math.atan2(
        dy,
        dx
      ) *
      (180 / Math.PI);

    const normalizedAngle =
      (angle + 360) % 360;

    const horizontal =
      normalizedAngle <= 6 ||
      normalizedAngle >= 354 ||
      (
        normalizedAngle >= 174 &&
        normalizedAngle <= 186
      );

    const vertical =
      (
        normalizedAngle >= 84 &&
        normalizedAngle <= 96
      ) ||
      (
        normalizedAngle >= 264 &&
        normalizedAngle <= 276
      );

    if (horizontal) {
      previewY =
        lineStart.y;
    }

    if (vertical) {
      previewX =
        lineStart.x;
    }
  }

  /* =========================
     ORTHO
  ========================= */

  if (
    orthoEnabled
  ) {
    const orthoPoint =
      applyOrtho(
        lineStart.x,
        lineStart.y,
        previewX,
        previewY
      );

    previewX =
      orthoPoint.x;

    previewY =
      orthoPoint.y;
  }

  /* =========================
     POLAR
  ========================= */

  if (
    polarEnabled
  ) {
    const polarPoint =
      applyPolar(
        lineStart.x,
        lineStart.y,
        previewX,
        previewY
      );

    previewX =
      polarPoint.x;

    previewY =
      polarPoint.y;
  }

 setLinePreview({
  x1: lineStart.x,
  y1: lineStart.y,
  x2: previewX,
  y2: previewY,
});

setPendingLinePoint({
  x: previewX,
  y: previewY,
});

return;
}

if (
  !isDrawing
) {
  return;
}

let x =
  snappedPoint.x;

let y =
  snappedPoint.y;

/* =========================
   ARC PREVIEW
========================= */

const lastObject =
  objects[
    objects.length - 1
  ];

if (
  lastObject &&
  lastObject.type === "line"
) {
  if (
    polarEnabled
  ) {
    const polarPoint =
      applyPolar(
        lastObject.points[0],
        lastObject.points[1],
        x,
        y
      );

    x =
      polarPoint.x;

    y =
      polarPoint.y;
  } else if (
    orthoEnabled
  ) {
    const orthoPoint =
      applyOrtho(
        lastObject.points[0],
        lastObject.points[1],
        x,
        y
      );

    x =
      orthoPoint.x;

    y =
      orthoPoint.y;
  }
}

/* =========================
   LIVE OBJECT UPDATE
========================= */

setObjects((prev) => {
  if (
    prev.length === 0
  ) {
    return prev;
  }

  const updated =
    [...prev];

  const lastIndex =
    updated.length - 1;

  const current = {
    ...updated[lastIndex],
  };

  /* LINE */

  if (
    current.type === "line"
  ) {
    current.points = [
      current.points[0],
      current.points[1],
      x,
      y,
    ];
  }

  /* CIRCLE */

  if (
    current.type === "circle"
  ) {
    const dx =
      x -
      current.x;

    const dy =
      y -
      current.y;

    current.radius =
      Math.sqrt(
        dx * dx +
        dy * dy
      );
  }
  
  /* =========================
   ELLIPSE RESIZE
========================= */

if (tool === "ellipse" && isDrawing) {
  setObjects((prev) => {
    if (prev.length === 0) {
      return prev;
    }

    const lastIndex = prev.length - 1;
    const ellipse = prev[lastIndex];

    if (
      !ellipse ||
      ellipse.type !== "ellipse"
    ) {
      return prev;
    }

    const radiusX = Math.abs(
      x - ellipse.x
    );

    const radiusY = Math.abs(
      y - ellipse.y
    );

    return prev.map(
      (object, index) =>
        index === lastIndex
          ? {
              ...object,
              radiusX,
              radiusY,
            }
          : object
    );
  });

  return;
}

  /* RECTANGLE */

  if (
    current.type ===
    "rectangle"
  ) {
    const startX =
      current.x;

    const startY =
      current.y;

    current.x =
      Math.min(
        startX,
        x
      );

    current.y =
      Math.min(
        startY,
        y
      );

    current.width =
      Math.abs(
        x -
        startX
      );

    current.height =
      Math.abs(
        y -
        startY
      );
  }

   updated[
    lastIndex
  ] = current;

  return updated;
});
/* =========================
   END HANDLE MOUSE MOVE
========================= */

};


/* =========================
   LINE GRIP DRAG
========================= */

const handleLineGripDragEnd = (
  index,
  gripIndex,
  e
) => {
  e.cancelBubble = true;

  if (isObjectLocked(index)) {
    window.alert(
      "This object is locked."
    );
    return;
  }

  const node = e.target;

  const newX = node.x();
  const newY = node.y();

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, objectIndex) => {
        if (
          objectIndex !== index ||
          object.type !== "line"
        ) {
          return object;
        }

        const newPoints = [
          ...object.points,
        ];

        if (gripIndex === 0) {
          newPoints[0] = newX;
          newPoints[1] = newY;
        }

        if (gripIndex === 1) {
          newPoints[2] = newX;
          newPoints[3] = newY;
        }

        return {
          ...object,
          points: newPoints,
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
   RECTANGLE GRIP DRAG
========================= */

const handleRectangleGripDragEnd = (
  index,
  gripType,
  e
) => {
  e.cancelBubble = true;

  if (isObjectLocked(index)) {
    window.alert(
      "This object is locked."
    );
    return;
  }

  const node = e.target;

  const mouseX = node.x();
  const mouseY = node.y();

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, objectIndex) => {
        if (
          objectIndex !== index ||
          object.type !== "rectangle"
        ) {
          return object;
        }

        let x = object.x;
        let y = object.y;
        let width = object.width;
        let height = object.height;

        if (
          gripType === "top-left"
        ) {
          width =
            object.x +
            object.width -
            mouseX;

          height =
            object.y +
            object.height -
            mouseY;

          x = mouseX;
          y = mouseY;
        }

        if (
          gripType === "top"
        ) {
          y = mouseY;

          height =
            object.y +
            object.height -
            mouseY;
        }

        if (
          gripType === "top-right"
        ) {
          width =
            mouseX -
            object.x;

          height =
            object.y +
            object.height -
            mouseY;

          y = mouseY;
        }

        if (
          gripType === "right"
        ) {
          width =
            mouseX -
            object.x;
        }

        if (
          gripType ===
          "bottom-right"
        ) {
          width =
            mouseX -
            object.x;

          height =
            mouseY -
            object.y;
        }

        if (
          gripType === "bottom"
        ) {
          height =
            mouseY -
            object.y;
        }

        if (
          gripType ===
          "bottom-left"
        ) {
          width =
            object.x +
            object.width -
            mouseX;

          height =
            mouseY -
            object.y;

          x = mouseX;
        }

        if (
          gripType === "left"
        ) {
          width =
            object.x +
            object.width -
            mouseX;

          x = mouseX;
        }

        if (width < 1) {
          x = x + width;
          width = Math.abs(width);
        }

        if (height < 1) {
          y = y + height;
          height = Math.abs(height);
        }

        return {
          ...object,
          x,
          y,
          width,
          height,
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
   POLYLINE GRIP DRAG
========================= */

const handlePolylineGripDragEnd = (
  index,
  pointIndex,
  e
) => {
  e.cancelBubble = true;

  if (isObjectLocked(index)) {
    window.alert(
      "This object is locked."
    );
    return;
  }

  const node = e.target;

  const newX = node.x();
  const newY = node.y();

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, objectIndex) => {
        if (
          objectIndex !== index ||
          object.type !== "polyline"
        ) {
          return object;
        }

        const newPoints = [
          ...object.points,
        ];

        newPoints[
          pointIndex
        ] = newX;

        newPoints[
          pointIndex + 1
        ] = newY;

        return {
          ...object,
          points: newPoints,
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
   SPLINE GRIP DRAG
========================= */

const handleSplineGripDragEnd = (
  objectIndex,
  pointIndex,
  e
) => {
  const object =
    objects[objectIndex];

  if (!object) {
    return;
  }

  if (
    object.type !== "spline" ||
    !Array.isArray(object.points)
  ) {
    return;
  }

  if (
    object.locked ||
    isLayerLocked(
      object.layerId || "layer-0"
    )
  ) {
    return;
  }

  const newX =
    e.target.x();

  const newY =
    e.target.y();

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (
        item,
        index
      ) => {
        if (
          index !== objectIndex
        ) {
          return item;
        }

        const newPoints = [
          ...item.points,
        ];

        newPoints[pointIndex] =
          newX;

        newPoints[
          pointIndex + 1
        ] = newY;

        return {
          ...item,
          points: newPoints,
        };
      }
    );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    objectIndex
  );

  setSelectedIndexes([
    objectIndex,
  ]);

  setFuture([]);
};

/* =========================
   TEXT GRIP DRAG
========================= */

const handleTextGripDragEnd = (
  index,
  e
) => {
  e.cancelBubble = true;

  if (isObjectLocked(index)) {
    window.alert(
      "This object is locked."
    );
    return;
  }

  const node = e.target;

  const newX = node.x();
  const newY = node.y();

  const object = objects[index];

  if (!object || object.type !== "text") {
    return;
  }

  const dx = newX - object.x;
  const dy = newY - object.y;

  const distance = Math.sqrt(
    dx * dx + dy * dy
  );

  const newFontSize = Math.max(
    8,
    Math.min(
      200,
      distance
    )
  );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (item, objectIndex) => {
        if (
          objectIndex !== index
        ) {
          return item;
        }

        return {
          ...item,
          fontSize: newFontSize,
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

const getObjectBounds = (object) => {
  if (!object) return null;

  /* LINE */
  if (
    object.type === "line" &&
    object.points?.length >= 4
  ) {
    const xs = [
      object.points[0],
      object.points[2],
    ];

    const ys = [
      object.points[1],
      object.points[3],
    ];

    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
  }

  /* POLYLINE */
  if (
    object.type === "polyline" &&
    object.points?.length >= 2
  ) {
    const xs = [];
    const ys = [];

    for (
      let i = 0;
      i < object.points.length;
      i += 2
    ) {
      xs.push(object.points[i]);
      ys.push(object.points[i + 1]);
    }

    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
  }

  /* CIRCLE */
  if (object.type === "circle") {
    const radius =
      Number(object.radius) || 0;

    return {
      left: object.x - radius,
      right: object.x + radius,
      top: object.y - radius,
      bottom: object.y + radius,
    };
  }

  /* =========================
   ELLIPSE BOUNDS
   ROTATION AWARE
========================= */

if (object.type === "ellipse") {
  const radiusX = Math.abs(
    Number(object.radiusX) || 0
  );

  const radiusY = Math.abs(
    Number(object.radiusY) || 0
  );

  const rotation =
    (Number(object.rotation) || 0) *
    (Math.PI / 180);

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const halfWidth = Math.sqrt(
    radiusX * radiusX * cos * cos +
    radiusY * radiusY * sin * sin
  );

  const halfHeight = Math.sqrt(
    radiusX * radiusX * sin * sin +
    radiusY * radiusY * cos * cos
  );

  return {
    left: object.x - halfWidth,
    right: object.x + halfWidth,
    top: object.y - halfHeight,
    bottom: object.y + halfHeight,
  };
}

  /* RECTANGLE */
  if (object.type === "rectangle") {
    return {
      left: Math.min(
        object.x,
        object.x + object.width
      ),
      right: Math.max(
        object.x,
        object.x + object.width
      ),
      top: Math.min(
        object.y,
        object.y + object.height
      ),
      bottom: Math.max(
        object.y,
        object.y + object.height
      ),
    };
  }

  /* HATCH */
  if (object.type === "hatch") {
    return {
      left: Math.min(
        object.x,
        object.x + object.width
      ),
      right: Math.max(
        object.x,
        object.x + object.width
      ),
      top: Math.min(
        object.y,
        object.y + object.height
      ),
      bottom: Math.max(
        object.y,
        object.y + object.height
      ),
    };
  }

  /* ARC */
  if (object.type === "arc") {
    const radius =
      Math.max(
        20,
        Number(object.radius) || 0
      );

    return {
      left: object.x - radius,
      right: object.x + radius,
      top: object.y - radius,
      bottom: object.y + radius,
    };
  }

  /* TEXT */
  if (object.type === "text") {
    const fontSize =
      Number(object.fontSize) || 24;

    const textWidth =
      (object.text || "").length *
      fontSize *
      0.6;

    return {
      left: object.x,
      right: object.x + textWidth,
      top: object.y,
      bottom: object.y + fontSize,
    };
  }

  return null;
};

/* =========================
   VIEWPORT OBJECT FILTER
========================= */

const isObjectVisible = (object) => {

  /* =========================
     HIDDEN OBJECT
  ========================= */

  if (object?.hidden) {
    return false;
  }

  const bounds = getObjectBounds(object);

  if (!bounds) {
    return true;
  }

  const canvasWidth =
    viewportSize.width <= 768
      ? viewportSize.width
      : viewportSize.width - 298;

  const canvasHeight =
    viewportSize.width <= 768
      ? viewportSize.height - 87 - 64
      : viewportSize.height - 87;

  const left =
    -position.x / scale;

  const right =
    (canvasWidth - position.x) / scale;

  const top =
    -position.y / scale;

  const bottom =
    (canvasHeight - position.y) / scale;

  const padding =
    500 / scale;

  return !(
    bounds.right <
      left - padding ||
    bounds.left >
      right + padding ||
    bounds.bottom <
      top - padding ||
    bounds.top >
      bottom + padding
  );
};

/* =========================
   VISIBLE OBJECTS FOR SNAP
========================= */

const getVisibleObjectsForSnap = () => {
  return objects.filter((object, index) => {

    /* HIDDEN OBJECTS NEVER SNAP */
    if (object?.hidden) {
      return false;
    }

    if (
      selectedIndexes.includes(index) ||
      index === selectedIndex
    ) {
      return true;
    }

    return isObjectVisible(object);
  });
};

/* =========================
   VISIBLE OBJECTS FOR SEARCH
========================= */

const getVisibleObjectsForSearch = () => {
  return objects.filter((object, index) => {

    /* HIDDEN OBJECTS NEVER SEARCH */
    if (object?.hidden) {
      return false;
    }

    if (
      selectedIndex === index ||
      selectedIndexes.includes(index)
    ) {
      return true;
    }

    return isObjectVisible(object);
  });
};

/* =========================
   VISIBLE OBJECTS FOR FIND
========================= */

const getVisibleObjectsForFind = () => {
  return objects.filter((object, index) => {

    /* HIDDEN OBJECTS NEVER FIND */
    if (object?.hidden) {
      return false;
    }

    if (
      selectedIndex === index ||
      selectedIndexes.includes(index)
    ) {
      return true;
    }

    return isObjectVisible(object);
  });
};

  /* =========================
     MOUSE UP
  ========================= */
const handleMouseUp = (e) => {

    /* SELECTION BOX RELEASE */
  if (
    tool === "select" &&
    isSelecting &&
    selectionBox
  ) {
    const left = Math.min(
      selectionBox.x,
      selectionBox.x + selectionBox.width
    );

    const right = Math.max(
      selectionBox.x,
      selectionBox.x + selectionBox.width
    );

    const top = Math.min(
      selectionBox.y,
      selectionBox.y + selectionBox.height
    );

    const bottom = Math.max(
      selectionBox.y,
      selectionBox.y + selectionBox.height
    );

    const isCrossing =
      selectionBox.width < 0;

    const selected = [];

    objects.forEach((object, index) => {
      const bounds =
        getObjectBounds(object);

      if (!bounds) return;

      let shouldSelect = false;

      if (isCrossing) {
        shouldSelect = !(
          bounds.right < left ||
          bounds.left > right ||
          bounds.bottom < top ||
          bounds.top > bottom
        );
      } else {
        shouldSelect =
          bounds.left >= left &&
          bounds.right <= right &&
          bounds.top >= top &&
          bounds.bottom <= bottom;
      }

      if (shouldSelect) {
        selected.push(index);
      }
    });

    setSelectedIndexes(selected);

    setSelectedIndex(
      selected.length > 0
        ? selected[selected.length - 1]
        : null
    );

    setSelectionBox(null);
    setIsSelecting(false);

    e.cancelBubble = true;
    return;
  }

  /* =========================
   COPY = FINISH DRAG
========================= */

if (
  tool === "copy" &&
  copyStartRef.current
) {
  copyStartRef.current = null;
  return;
}

  if (
  tool === "move" &&
  moveStartRef.current
) {
  finishMove();
  return;
}

/* =========================
   OFFSET = FINISH
========================= */

if (
  tool === "offset" &&
  offsetStartRef.current
) {
  const offsetData =
    offsetStartRef.current;

  const index =
    offsetData.index;

  const original =
    objects[index];

  if (!original) {
    offsetStartRef.current = null;
    return;
  }

  /* =========================
   OFFSET DISTANCE
========================= */

let distance = 0;
let dragDx = 0;
let dragDy = 0;

if (
  offsetData.startX !== null &&
  offsetData.startY !== null &&
  offsetData.currentX !== undefined &&
  offsetData.currentY !== undefined
) {
  dragDx =
    offsetData.currentX -
    offsetData.startX;

  dragDy =
    offsetData.currentY -
    offsetData.startY;

  distance =
    Math.hypot(
      dragDx,
      dragDy
    );
}

/* =========================
   OFFSET DIRECTION
========================= */

let offsetSign = 1;

if (
  original.type === "line" &&
  original.points?.length >= 4
) {
  const [
    x1,
    y1,
    x2,
    y2,
  ] = original.points;

  const lineDx =
    x2 - x1;

  const lineDy =
    y2 - y1;

  const cross =
    lineDx * dragDy -
    lineDy * dragDx;

  if (cross < 0) {
    offsetSign = -1;
  }
}

const signedDistance =
  distance * offsetSign;

  /* =========================
     NO DRAG
  ========================= */

if (
  !offsetData.moved ||
  distance <= 0
) {
  setOffsetPreview(null);

  offsetStartRef.current = null;

  /* Normal click = existing OFFSET prompt */
  offsetObject(index);

  return;
}

 /* =========================
   DRAG OFFSET
========================= */

/* =========================
   OFFSET OBJECT SAFETY
========================= */

if (
  original.hidden
) {
  window.alert(
    "Selected object is hidden."
  );

  setOffsetPreview(null);
  offsetStartRef.current = null;
  return;
}

if (
  original.locked
) {
  window.alert(
    "Selected object is locked."
  );

  setOffsetPreview(null);
  offsetStartRef.current = null;
  return;
}

const originalLayerId =
  original.layerId ||
  "layer-0";

if (
  isLayerLocked(
    originalLayerId
  )
) {
  window.alert(
    "Selected object is on a locked layer."
  );

  setOffsetPreview(null);
  offsetStartRef.current = null;
  return;
}

const previousObjects = [
  ...objects,
];

  let newObject = null;

  /* LINE */
  if (
    original.type === "line" &&
    original.points?.length >= 4
  ) {
    const [
      x1,
      y1,
      x2,
      y2,
    ] = original.points;

    const dx = x2 - x1;
    const dy = y2 - y1;

    const length =
      Math.hypot(dx, dy);

    if (length > 0) {
      const nx = -dy / length;
      const ny = dx / length;

      newObject = {
        ...original,
        locked: false,
        hidden: false,
        points: [
         x1 + nx * signedDistance,
y1 + ny * signedDistance,

x2 + nx * signedDistance,
y2 + ny * signedDistance,
        ],
      };
    }
  }

  /* RECTANGLE */
  else if (
    original.type === "rectangle"
  ) {
    newObject = {
      ...original,
      locked: false,
      hidden: false,
      x:
        original.x -
        distance,
      y:
        original.y -
        distance,
      width:
        Math.abs(
          original.width
        ) +
        distance * 2,
      height:
        Math.abs(
          original.height
        ) +
        distance * 2,
    };
  }

  /* CIRCLE */
  else if (
    original.type === "circle"
  ) {
    newObject = {
      ...original,
      locked: false,
      hidden: false,
      radius:
        original.radius +
        distance,
    };
  }

  /* ELLIPSE */

else if (
  original.type === "ellipse"
) {
  newObject = {
    ...original,
    locked: false,
    hidden: false,

    radiusX:
      Math.max(
        1,
        Number(original.radiusX || 0) +
          distance
      ),

    radiusY:
      Math.max(
        1,
        Number(original.radiusY || 0) +
          distance
      ),
  };
}

  /* ARC */
  else if (
    original.type === "arc"
  ) {
    newObject = {
      ...original,
      locked: false,
      hidden: false,
      radius:
        original.radius +
        distance,
    };
  }

  /* HATCH */
  else if (
    original.type === "hatch"
  ) {
    newObject = {
      ...original,
      locked: false,
      hidden: false,
      x:
        original.x -
        distance,
      y:
        original.y -
        distance,
      width:
        Math.abs(
          original.width
        ) +
        distance * 2,
      height:
        Math.abs(
          original.height
        ) +
        distance * 2,
    };
  }

  if (!newObject) {
    window.alert(
      "Selected object cannot be offset."
    );

    offsetStartRef.current = null;
    return;
  }

  const newObjects = [
    ...objects,
    newObject,
  ];

  setObjects(newObjects);

  const newIndex =
    newObjects.length - 1;

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setOffsetPreview(null);

  offsetStartRef.current = null;
  return;
}

  if (
    e.evt?.button === 1 ||
    isPanning
  ) {
    setIsPanning(false);
    panStartRef.current = null;
    return;
  }
  if (
  tool === "line" ||
  tool === "polyline" ||
  tool === "arc"
) {
  return;
}

if (!isDrawing) return;

setIsDrawing(false);
setSnapPoint(null);
}

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
    setLineStart(null);
    setPendingLinePoint(null);
    setLinePreview(null);
    setLineLengthInput("");
    setShowLineInput(false);
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
    setLineStart(null);
    setPendingLinePoint(null);
    setLinePreview(null);
    setLineLengthInput("");
    setShowLineInput(false);
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

  setLineStart(null);
  setPendingLinePoint(null);
  setLinePreview(null);
  setLineLengthInput("");
  setShowLineInput(false);

  actionStartRef.current = null;

  setSelectedIndex(
    objects.length - 1
  );
};

/* =========================
   KEYBOARD
========================= */

const handleKeyDown = (e) => {
  console.log("KEYBOARD EVENT:", e.key);
  

  const target = e.target;

  const tagName =
    target?.tagName;

  /* =========================
     INPUT/TEXTAREA/SELECT
     me shortcuts disabled
  ========================= */

  if (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target?.isContentEditable
  ) {
    return;
  }

  const key =
    e.key.toLowerCase();


/* =========================
   U = UNDO LAST POLYLINE SEGMENT
========================= */

if (
  key === "u" &&
  !e.ctrlKey &&
  !e.metaKey &&
  !e.shiftKey &&
  tool === "polyline" &&
  lineStart &&
  !showLineInput
) {
  e.preventDefault();
  window.alert("U shortcut triggered");

  if (undoActiveLineSegment()) {
    return;
  }

  return;
}


// =========================
// U = UNDO LAST LINE SEGMENT
// =========================
if (
  key === "u" &&
  !e.ctrlKey &&
  tool === "line" &&
  lineStart &&
  !showLineInput
) {
  e.preventDefault();

  const lastIndex =
    objects.length - 1;

  const lastObject =
    objects[lastIndex];

  if (
    !lastObject ||
    lastObject.type !== "line" ||
    !Array.isArray(lastObject.points) ||
    lastObject.points.length < 4
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const deletedStartX =
    lastObject.points[0];

  const deletedStartY =
    lastObject.points[1];

  setObjects((prev) => {
    if (prev.length === 0) {
      return prev;
    }

    return prev.slice(0, -1);
  });

  saveHistory(
    previousObjects,
    [...measurements]
  );

  const objectsBeforeLast =
    objects.slice(0, -1);

  const previousLine =
    [...objectsBeforeLast]
      .reverse()
      .find(
        (obj) =>
          obj.type === "line" &&
          Array.isArray(obj.points) &&
          obj.points.length >= 4
      );

  if (previousLine) {
    setLineStart({
      x: previousLine.points[2],
      y: previousLine.points[3],
    });
  } else {
    setLineStart({
      x: deletedStartX,
      y: deletedStartY,
    });
  }

  setPendingLinePoint(null);

  setLinePreview({
    x1:
      previousLine
        ? previousLine.points[2]
        : deletedStartX,
    y1:
      previousLine
        ? previousLine.points[3]
        : deletedStartY,
    x2:
      previousLine
        ? previousLine.points[2]
        : deletedStartX,
    y2:
      previousLine
        ? previousLine.points[3]
        : deletedStartY,
  });

  setIsDrawing(true);

  return;
}

    // =========================
// C = CLOSE POLYLINE
// =========================
if (
  key === "c" &&
  !e.ctrlKey &&
  tool === "polyline" &&
  isDrawing &&
  !showLineInput
) {
  e.preventDefault();

  const lastIndex =
    objects.length - 1;

  const lastObject =
    objects[lastIndex];

  if (
    !lastObject ||
    lastObject.type !== "polyline" ||
    !Array.isArray(lastObject.points) ||
    lastObject.points.length < 4
  ) {
    finishPolyline();
    return;
  }

  const firstX =
    lastObject.points[0];

  const firstY =
    lastObject.points[1];

  const lastX =
    lastObject.points[
      lastObject.points.length - 2
    ];

  const lastY =
    lastObject.points[
      lastObject.points.length - 1
    ];

  const alreadyClosed =
    Math.abs(firstX - lastX) < 0.001 &&
    Math.abs(firstY - lastY) < 0.001;

  if (!alreadyClosed) {
    saveHistory(
      [...objects],
      [...measurements]
    );

    setObjects((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const updated = [...prev];
      const index = updated.length - 1;
      const polyline = updated[index];

      if (
        !polyline ||
        polyline.type !== "polyline"
      ) {
        return prev;
      }

      updated[index] = {
        ...polyline,
        points: [
          ...polyline.points,
          firstX,
          firstY,
        ],
      };

      return updated;
    });
  }

  setIsDrawing(false);
  setLineStart(null);
  setPendingLinePoint(null);
  setLinePreview(null);
  setLineLengthInput("");
  setShowLineInput(false);
  setSnapPoint(null);
  setSnapType("");
  actionStartRef.current = null;

  setSelectedIndex(lastIndex);
  setSelectedIndexes([lastIndex]);

  return;
}

    // =========================
// ENTER = FINISH POLYLINE
// =========================
if (
  e.key === "Enter" &&
  tool === "polyline" &&
  isDrawing &&
  !showLineInput
) {
  e.preventDefault();
  finishPolyline();
  return;
}


/* =========================
   CTRL + S = SAVE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "s"
) {
  e.preventDefault();

  try {
    saveDrawing();
  } catch (error) {
    console.error(
      "Save failed:",
      error
    );

    window.alert(
      "Save nahi ho paya."
    );
  }

  return;
}

/* =========================
   CTRL + O = OPEN
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "o"
) {
  e.preventDefault();

  try {
    openDrawing();
  } catch (error) {
    console.error(
      "Open failed:",
      error
    );

    window.alert(
      "Drawing open nahi ho payi."
    );
  }

  return;
}

/* =========================
   CTRL + N = NEW DRAWING
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "n"
) {
  e.preventDefault();

  try {
    clearDrawing();
  } catch (error) {
    console.error(
      "New drawing failed:",
      error
    );

    window.alert(
      "New drawing nahi ban payi."
    );
  }

  return;
}

/* =========================
   DELETE = ERASE SELECTED
========================= */

if (e.key === "Delete") {
  const activeElement =
    document.activeElement;

  if (
    activeElement &&
    (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.isContentEditable
    )
  ) {
    return;
  }

  e.preventDefault();

  runMobileCommand("erase");

  return;
}

/* =========================
   ESC = CANCEL ACTIVE COMMAND
========================= */

if (e.key === "Escape") {
  e.preventDefault();

  runMobileCommand("esc");

  return;
}


/* =========================
   CTRL + Z / CTRL + Y
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "z"
) {
  e.preventDefault();

  if (undoActiveLineSegment()) {
    return;
  }

  try {
    undo();
  } catch (error) {
    console.error(
      "Undo failed:",
      error
    );
  }

  return;
}

if (
  (e.ctrlKey || e.metaKey) &&
  (
    e.key.toLowerCase() === "y" ||
    (
      e.shiftKey &&
      e.key.toLowerCase() === "z"
    )
  )
) {
  e.preventDefault();

  try {
    redo();
  } catch (error) {
    console.error(
      "Redo failed:",
      error
    );
  }

  return;
}

/* =========================
   CTRL + A = SELECT ALL
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "a"
) {
  e.preventDefault();

  runMobileCommand("all");

  return;
}

/* =========================
   CTRL + D = DESELECT ALL
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "d"
) {
  e.preventDefault();

  runMobileCommand("none");

  return;
}

/* =========================
   + / - = ZOOM
========================= */

if (
  e.key === "+" ||
  e.key === "="
) {
  const activeElement =
    document.activeElement;

  if (
    activeElement &&
    (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.isContentEditable
    )
  ) {
    return;
  }

  e.preventDefault();

  setScale((prevScale) =>
    Math.min(
      prevScale * 1.2,
      100
    )
  );

  return;
}

if (e.key === "-") {
  const activeElement =
    document.activeElement;

  if (
    activeElement &&
    (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.isContentEditable
    )
  ) {
    return;
  }

  e.preventDefault();

  setScale((prevScale) =>
    Math.max(
      prevScale / 1.2,
      0.01
    )
  );

  return;
}

/* =========================
   HOME = ZOOM FIT
========================= */

if (e.key === "Home") {
  const activeElement =
    document.activeElement;

  if (
    activeElement &&
    (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.isContentEditable
    )
  ) {
    return;
  }

  e.preventDefault();

  zoomFit();

  return;
}

/* =========================
   CTRL + 1 = PROPERTIES
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "1"
) {
  e.preventDefault();

  runMobileCommand("properties");

  return;
}

/* =========================
   CTRL + 2 = LAYERS
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "2"
) {
  e.preventDefault();

  runMobileCommand("layers");

  return;
}

/* =========================
   CTRL + 3 = MEASURE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "3"
) {
  e.preventDefault();

  runMobileCommand("measure");

  return;
}

/* =========================
   CTRL + 4 = AREA
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "4"
) {
  e.preventDefault();

  runMobileCommand("area");

  return;
}

/* =========================
   CTRL + 5 = DIMENSION
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "5"
) {
  e.preventDefault();

  runMobileCommand("dimension");

  return;
}

/* =========================
   CTRL + 6 = ANGULAR DIMENSION
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "6"
) {
  e.preventDefault();

  runMobileCommand(
    "angulardimension"
  );

  return;
}

/* =========================
   CTRL + 7 = RADIUS DIMENSION
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "7"
) {
  e.preventDefault();

  runMobileCommand(
    "radiusdimension"
  );

  return;
}

/* =========================
   CTRL + 8 = DIAMETER DIMENSION
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "8"
) {
  e.preventDefault();

  runMobileCommand(
    "diameterdimension"
  );

  return;
}

/* =========================
   CTRL + 9 = MOVE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "9"
) {
  e.preventDefault();

  runMobileCommand("move");

  return;
}

/* =========================
   CTRL + 0 = COPY
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key === "0"
) {
  e.preventDefault();

  runMobileCommand("copy");

  return;
}

/* =========================
   CTRL + SHIFT + 1 = ROTATE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "1"
) {
  e.preventDefault();

  runMobileCommand("rotate");

  return;
}

/* =========================
   CTRL + SHIFT + 2 = TRIM
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "2"
) {
  e.preventDefault();

  runMobileCommand("trim");

  return;
}

/* =========================
   CTRL + SHIFT + 3 = EXTEND
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "3"
) {
  e.preventDefault();

  runMobileCommand("extend");

  return;
}

/* =========================
   CTRL + SHIFT + 4 = STRETCH
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "4"
) {
  e.preventDefault();

  runMobileCommand("stretch");

  return;
}

/* =========================
   CTRL + SHIFT + 5 = OFFSET
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "5"
) {
  e.preventDefault();

  runMobileCommand("offset");

  return;
}

/* =========================
   CTRL + SHIFT + 6 = MIRROR
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "6"
) {
  e.preventDefault();

  runMobileCommand("mirror");

  return;
}

/* =========================
   CTRL + SHIFT + 7 = SCALE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "7"
) {
  e.preventDefault();

  runMobileCommand("scale");

  return;
}

/* =========================
   CTRL + SHIFT + 8 = FILLET
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "8"
) {
  e.preventDefault();

  runMobileCommand("fillet");

  return;
}

/* =========================
   CTRL + SHIFT + 9 = CHAMFER
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "9"
) {
  e.preventDefault();

  runMobileCommand("chamfer");

  return;
}

/* =========================
   CTRL + SHIFT + 0 = EXPLODE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key === "0"
) {
  e.preventDefault();

  runMobileCommand("explode");

  return;
}

/* =========================
   CTRL + SHIFT + P = EXPORT PNG
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "p"
) {
  e.preventDefault();

  try {
    exportPNG();
  } catch (error) {
    console.error(
      "Export PNG failed:",
      error
    );

    window.alert(
      "PNG export nahi ho paya."
    );
  }

  return;
}

/* =========================
   CTRL + SHIFT + G = EXPORT SVG
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "g"
) {
  e.preventDefault();

  try {
    exportSVG();
  } catch (error) {
    console.error(
      "Export SVG failed:",
      error
    );

    window.alert(
      "SVG export nahi ho paya."
    );
  }

  return;
}

/* =========================
   CTRL + SHIFT + D = EXPORT DXF
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "d"
) {
  e.preventDefault();

  try {
    exportDXF();
  } catch (error) {
    console.error(
      "Export DXF failed:",
      error
    );

    window.alert(
      "DXF export nahi ho paya."
    );
  }

  return;
}

/* =========================
   CTRL + ALT + O = OPEN
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.altKey &&
  e.key.toLowerCase() === "o"
) {
  e.preventDefault();

  try {
    openDrawing();
  } catch (error) {
    console.error(
      "Open failed:",
      error
    );

    window.alert(
      "Drawing open nahi ho payi."
    );
  }

  return;
}

/* =========================
   CTRL + ALT + N = NEW
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.altKey &&
  e.key.toLowerCase() === "n"
) {
  e.preventDefault();

  try {
    clearDrawing();
  } catch (error) {
    console.error(
      "New drawing failed:",
      error
    );

    window.alert(
      "New drawing nahi ban payi."
    );
  }

  return;
}

/* =========================
   CTRL + ALT + R = RESTORE AUTOSAVE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.altKey &&
  e.key.toLowerCase() === "r"
) {
  e.preventDefault();

  try {
    restoreAutoSave();
  } catch (error) {
    console.error(
      "Restore failed:",
      error
    );

    window.alert(
      "AutoSave restore nahi ho paya."
    );
  }

  return;
}

/* =========================
   CTRL + ALT + C = CLEAR AUTOSAVE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.altKey &&
  e.key.toLowerCase() === "c"
) {
  e.preventDefault();

  try {
    clearAutoSave();
  } catch (error) {
    console.error(
      "Clear AutoSave failed:",
      error
    );

    window.alert(
      "AutoSave clear nahi ho paya."
    );
  }

  return;
}

/* =========================
   CTRL + SHIFT + Z = REDO
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "z"
) {
  e.preventDefault();

  try {
    redo();
  } catch (error) {
    console.error(
      "Redo failed:",
      error
    );
  }

  return;
}

/* =========================
   F2 = COMMAND HISTORY
========================= */

if (e.key === "F2") {
  e.preventDefault();

  if (
    mobileCommandHistory.length > 0
  ) {
    const lastCommand =
      mobileCommandHistory[
        mobileCommandHistory.length - 1
      ];

    setCommandText(
      lastCommand || ""
    );

    setMobileCommandPanel("home");
  }

  return;
}

/* =========================
   F1 = HOME
========================= */

if (e.key === "F1") {
  e.preventDefault();

  setShowHome(true);

  return;
}

/* =========================
   CTRL + SHIFT + J = JOIN
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "j"
) {
  e.preventDefault();

  runMobileCommand("join");

  return;
}


/* =========================
   CTRL + SHIFT + K = LAYERS
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "k"
) {
  e.preventDefault();

  runMobileCommand("layers");

  return;
}

/* =========================
   CTRL + SHIFT + U = PROPERTIES
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "u"
) {
  e.preventDefault();

  runMobileCommand("properties");

  return;
}

/* =========================
   VIEW NAVIGATION SHORTCUTS
========================= */

if (!isTypingField) {
  if (e.key === "PageUp") {
    e.preventDefault();

    setScale((prevScale) =>
      Math.min(
        prevScale * 1.2,
        100
      )
    );

    return;
  }

  if (e.key === "PageDown") {
    e.preventDefault();

    setScale((prevScale) =>
      Math.max(
        prevScale / 1.2,
        0.01
      )
    );

    return;
  }

  if (e.key === "End") {
    e.preventDefault();

    const centerX =
      viewportSize.width / 2;

    const centerY =
      (viewportSize.height - 87 - 64) / 2;

    setScale(1);

    setPosition({
      x: centerX,
      y: centerY,
    });

    return;
  }
}

/* =========================
   CTRL + SHIFT + F = FIND
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "f"
) {
  e.preventDefault();

  runMobileCommand("find");

  return;
}

/* =========================
   CTRL + SHIFT DRAWING TOOLS
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey
) {
  const drawingShortcut =
    e.key.toLowerCase();

  if (drawingShortcut === "l") {
    e.preventDefault();

    runMobileCommand("line");

    return;
  }

  if (drawingShortcut === "c") {
    e.preventDefault();

    runMobileCommand("circle");

    return;
  }

  if (drawingShortcut === "r") {
    e.preventDefault();

    runMobileCommand("rectangle");

    return;
  }

  if (drawingShortcut === "t") {
    e.preventDefault();

    runMobileCommand("text");

    return;
  }

  if (drawingShortcut === "h") {
    e.preventDefault();

    runMobileCommand("hatch");

    return;
  }
}

/* =========================
   MEASUREMENT SHORTCUTS
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.altKey
) {
  const measurementShortcut =
    e.key.toLowerCase();

  if (
    measurementShortcut === "m"
  ) {
    e.preventDefault();

    runMobileCommand("measure");

    return;
  }

  if (
    measurementShortcut === "a"
  ) {
    e.preventDefault();

    runMobileCommand("area");

    return;
  }

  if (
    measurementShortcut === "d"
  ) {
    e.preventDefault();

    runMobileCommand("dimension");

    return;
  }

  if (
    measurementShortcut === "g"
  ) {
    e.preventDefault();

    runMobileCommand(
      "angulardimension"
    );

    return;
  }

  if (
    measurementShortcut === "b"
  ) {
    e.preventDefault();

    runMobileCommand(
      "radiusdimension"
    );

    return;
  }

  if (
    measurementShortcut === "i"
  ) {
    e.preventDefault();

    runMobileCommand(
      "diameterdimension"
    );

    return;
  }
}

/* =========================
   CAD FUNCTION KEYS
========================= */

if (e.key === "F3") {
  e.preventDefault();

  setObjectSnapEnabled(
    (prev) => !prev
  );

  return;
}

if (e.key === "F7") {
  e.preventDefault();

  setGridEnabled(
    (prev) => !prev
  );

  return;
}

if (e.key === "F9") {
  e.preventDefault();

  setGridSnapEnabled(
    (prev) => !prev
  );

  return;
}

if (e.key === "F10") {
  e.preventDefault();

  setPolarEnabled(
    (prev) => !prev
  );

  return;
}

if (e.key === "F11") {
  e.preventDefault();

  setObjectSnapTrackingEnabled(
    (prev) => !prev
  );

  return;
}

if (e.key === "F12") {
  e.preventDefault();

  setDynamicInputEnabled(
    (prev) => !prev
  );

  return;
}

  /* =========================
     F8 = ORTHO
  ========================= */

  if (e.key === "F8") {
  e.preventDefault();

  toggleOrtho();

  return;
}


  /* =========================
     CTRL + C
  ========================= */

  if (
    e.ctrlKey &&
    key === "c"
  ) {
    e.preventDefault();

    const indexesToCopy =
      selectedIndexes.length > 0
        ? selectedIndexes
        : selectedIndex !== null
        ? [selectedIndex]
        : [];

    if (
      indexesToCopy.length === 0
    ) {
      return;
    }

    const copiedObjects =
      indexesToCopy
        .map(
          (index) =>
            objects[index]
        )
        .filter(Boolean)
        .map(
          (object) =>
            JSON.parse(
              JSON.stringify(
                object
              )
            )
        );

    setClipboardObjects(
      copiedObjects
    );

    return;
  }

  /* =========================
     CTRL + V
  ========================= */

  if (
    e.ctrlKey &&
    key === "v"
  ) {
    e.preventDefault();

    if (
      clipboardObjects.length === 0
    ) {
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const pastedObjects =
      clipboardObjects.map(
        (object) => {

          const copy =
            JSON.parse(
              JSON.stringify(
                object
              )
            );

          if (
            copy.type === "line" ||
            copy.type === "polyline"
          ) {
            copy.points =
              copy.points.map(
                (value) =>
                  value + GRID_SIZE
              );
          } else {
            copy.x =
              (copy.x || 0) +
              GRID_SIZE;

            copy.y =
              (copy.y || 0) +
              GRID_SIZE;
          }

          return copy;
        }
      );

    const newObjects = [
      ...objects,
      ...pastedObjects,
    ];

    setObjects(
      newObjects
    );

    const newIndexes =
      pastedObjects.map(
        (_, index) =>
          objects.length + index
      );

    setSelectedIndexes(
      newIndexes
    );

    setSelectedIndex(
      newIndexes[
        newIndexes.length - 1
      ]
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

 /* =========================
   FINAL KEYBOARD SHORTCUTS
========================= */

/* =========================
   CTRL + S = SAVE
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "s"
) {
  e.preventDefault();

  try {
    saveDrawing();
  } catch (error) {
    console.error(
      "Save failed:",
      error
    );

    window.alert(
      "Save nahi ho paya."
    );
  }

  return;
}

/* =========================
   CTRL + O = OPEN
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "o"
) {
  e.preventDefault();

  try {
    openDrawing();
  } catch (error) {
    console.error(
      "Open failed:",
      error
    );

    window.alert(
      "Drawing open nahi ho payi."
    );
  }

  return;
}

/* =========================
   CTRL + N = NEW
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "n"
) {
  e.preventDefault();

  try {
    clearDrawing();
  } catch (error) {
    console.error(
      "New drawing failed:",
      error
    );
  }

  return;
}

/* =========================
   CTRL + Z = UNDO
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "z"
) {
  e.preventDefault();

  if (
    typeof undoActiveLineSegment ===
      "function" &&
    undoActiveLineSegment()
  ) {
    return;
  }

  try {
    undo();
  } catch (error) {
    console.error(
      "Undo failed:",
      error
    );
  }

  return;
}

/* =========================
   CTRL + Y = REDO
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "y"
) {
  e.preventDefault();

  redo();

  return;
}

/* =========================
   CTRL + SHIFT + Z = REDO
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  e.key.toLowerCase() === "z"
) {
  e.preventDefault();

  redo();

  return;
}

/* =========================
   CTRL + A = SELECT ALL
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "a"
) {
  e.preventDefault();

  runMobileCommand("all");

  return;
}

/* =========================
   CTRL + D = DESELECT
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.key.toLowerCase() === "d"
) {
  e.preventDefault();

  runMobileCommand("none");

  return;
}

/* =========================
   DELETE / BACKSPACE
========================= */

if (
  e.key === "Delete" ||
  e.key === "Backspace"
) {
  e.preventDefault();

  deleteSelected();

  return;
}

/* =========================
   ESCAPE
========================= */

if (e.key === "Escape") {

  if (isSelecting) {
    setIsSelecting(false);
    setSelectionBox(null);
    return;
  }

  if (showLineInput) {
    setShowLineInput(false);
    setPendingLinePoint(null);
    setLineLengthInput("");
    setLinePreview(null);
    return;
  }

  if (
    tool === "line" ||
    tool === "polyline"
  ) {
    setLineStart(null);
    setLinePreview(null);
    setIsDrawing(false);

    setPendingLinePoint(null);
    setLineLengthInput("");
    setShowLineInput(false);
  }

  if (isDrawing) {
    setIsDrawing(false);

    setObjects((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const lastObject =
        prev[prev.length - 1];

      if (
        lastObject &&
        (
          lastObject.type === "line" ||
          lastObject.type === "circle" ||
          lastObject.type === "rectangle" ||
          lastObject.type === "polyline" ||
          lastObject.type === "arc"
        )
      ) {
        return prev.slice(0, -1);
      }

      return prev;
    });

    actionStartRef.current = null;
    setArcPoints([]);
    stretchStartRef.current = null;
    setSnapType("");
    setSnapPoint(null);

    return;
  }

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setSelectedMeasurementIndex(null);
  setCommandFirstIndex(null);
  setMeasureStart(null);
  setAnglePoints([]);
  setIsDrawing(false);
  setSnapPoint(null);

  return;
}

/* =========================
   HOME = ZOOM FIT
========================= */

if (e.key === "Home") {
  e.preventDefault();

  zoomFit();

  return;
}

/* =========================
   END = RESET VIEW
========================= */

if (e.key === "End") {
  e.preventDefault();

  setScale(1);

  setPosition({
    x:
      (
        viewportSize.width <= 768
          ? viewportSize.width
          : viewportSize.width - 298
      ) / 2,

    y:
      (
        viewportSize.width <= 768
          ? viewportSize.height - 87 - 64
          : viewportSize.height - 87
      ) / 2,
  });

  return;
}

/* =========================
   + / = ZOOM IN
========================= */

if (
  e.key === "+" ||
  e.key === "=" ||
  e.code === "NumpadAdd"
) {
  e.preventDefault();

  setScale((prev) =>
    Math.min(
      prev * 1.2,
      1000000
    )
  );

  return;
}

/* =========================
   - ZOOM OUT
========================= */

if (
  e.key === "-" ||
  e.key === "_" ||
  e.code === "NumpadSubtract"
) {
  e.preventDefault();

  setScale((prev) =>
    Math.max(
      prev / 1.2,
      0.000001
    )
  );

  return;
}

/* =========================
   PAGE UP / DOWN ZOOM
========================= */

if (e.key === "PageUp") {
  e.preventDefault();

  setScale((prev) =>
    Math.min(
      prev * 1.2,
      1000000
    )
  );

  return;
}

if (e.key === "PageDown") {
  e.preventDefault();

  setScale((prev) =>
    Math.max(
      prev / 1.2,
      0.000001
    )
  );

  return;
}

/* =========================
   F1 = HOME
========================= */

if (e.key === "F1") {
  e.preventDefault();

  setShowHome(true);

  return;
}

/* =========================
   F2 = LAST COMMAND
========================= */

if (e.key === "F2") {
  e.preventDefault();

  if (
    mobileCommandHistory.length > 0
  ) {
    const lastCommand =
      mobileCommandHistory[
        mobileCommandHistory.length - 1
      ];

    setCommandText(
      lastCommand || ""
    );

    setMobileCommandPanel("home");
  }

  return;
}

/* =========================
   F3 = OSNAP
========================= */

if (e.key === "F3") {
  e.preventDefault();

  setObjectSnapEnabled(
    (prev) => !prev
  );

  return;
}

/* =========================
   F7 = GRID
========================= */

if (e.key === "F7") {
  e.preventDefault();

  setGridEnabled(
    (prev) => !prev
  );

  return;
}

/* =========================
   F8 = ORTHO
========================= */

if (e.key === "F8") {
  e.preventDefault();

  toggleOrtho();

  return;
}

/* =========================
   F9 = GRID SNAP
========================= */

if (e.key === "F9") {
  e.preventDefault();

  setGridSnapEnabled(
    (prev) => !prev
  );

  return;
}

/* =========================
   F10 = POLAR
========================= */

if (e.key === "F10") {
  e.preventDefault();

  togglePolar();

  return;
}

/* =========================
   F11 = TRACKING
========================= */

if (e.key === "F11") {
  e.preventDefault();

  setObjectSnapTrackingEnabled(
    (prev) => !prev
  );

  return;
}

/* =========================
   F12 = DYNAMIC INPUT
========================= */

if (e.key === "F12") {
  e.preventDefault();

  setDynamicInputEnabled(
    (prev) => !prev
  );

  return;
}

/* =========================
   CTRL + 1 ... 0
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  !e.shiftKey &&
  !e.altKey
) {
  const commands = {
    "1": "properties",
    "2": "layers",
    "3": "measure",
    "4": "area",
    "5": "dimension",
    "6": "angulardimension",
    "7": "radiusdimension",
    "8": "diameterdimension",
    "9": "move",
    "0": "copy",
  };

  if (commands[e.key]) {
    e.preventDefault();

    runMobileCommand(
      commands[e.key]
    );

    return;
  }
}

/* =========================
   CTRL + SHIFT + 1 ... 0
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.shiftKey &&
  !e.altKey
) {
  const commands = {
    "1": "rotate",
    "2": "trim",
    "3": "extend",
    "4": "stretch",
    "5": "offset",
    "6": "mirror",
    "7": "scale",
    "8": "fillet",
    "9": "chamfer",
    "0": "explode",
  };

  if (commands[e.key]) {
    e.preventDefault();

    runMobileCommand(
      commands[e.key]
    );

    return;
  }

  const key =
    e.key.toLowerCase();

  if (key === "j") {
    e.preventDefault();
    runMobileCommand("join");
    return;
  }

  if (key === "k") {
    e.preventDefault();
    runMobileCommand("layers");
    return;
  }

  if (key === "u") {
    e.preventDefault();
    runMobileCommand("properties");
    return;
  }

  if (key === "f") {
    e.preventDefault();
    runMobileCommand("find");
    return;
  }

    if (key === "l") {
    e.preventDefault();
    runMobileCommand("line");
    return;
  }

  if (key === "c") {
    e.preventDefault();
    runMobileCommand("circle");
    return;
  }

  if (key === "r") {
    e.preventDefault();
    runMobileCommand("rectangle");
    return;
  }

  if (key === "t") {
    e.preventDefault();
    runMobileCommand("text");
    return;
  }

  if (key === "h") {
    e.preventDefault();
    runMobileCommand("hatch");
    return;
  }

  if (key === "v") {
    e.preventDefault();
    runMobileCommand("move");
    return;
  }

  if (key === "w") {
    e.preventDefault();
    runMobileCommand("offset");
    return;
  }

  if (key === "b") {
    e.preventDefault();
    runMobileCommand("scale");
    return;
  }

  if (key === "q") {
    e.preventDefault();
    runMobileCommand("erase");
    return;
  }

  if (key === "n") {
    e.preventDefault();
    runMobileCommand("trim");
    return;
  }

  if (key === "y") {
    e.preventDefault();
    runMobileCommand("extend");
    return;
  }

  if (key === "i") {
    e.preventDefault();
    runMobileCommand("mirror");
    return;
  }

  if (key === "p") {
    e.preventDefault();
    exportPNG();
    return;
  }

  if (key === "g") {
    e.preventDefault();
    exportSVG();
    return;
  }

  if (key === "d") {
    e.preventDefault();
    exportDXF();
    return;
  }
}

/* =========================
   CTRL + ALT
========================= */

if (
  (e.ctrlKey || e.metaKey) &&
  e.altKey
) {
  const key =
    e.key.toLowerCase();

  if (key === "o") {
    e.preventDefault();
    openDrawing();
    return;
  }

  if (key === "n") {
    e.preventDefault();
    clearDrawing();
    return;
  }

  if (key === "r") {
    e.preventDefault();
    restoreAutoSave();
    return;
  }

  if (key === "c") {
    e.preventDefault();
    clearAutoSave();
    return;
  }

  const commands = {
    m: "measure",
    a: "area",
    d: "dimension",
    g: "angulardimension",
    b: "radiusdimension",
    i: "diameterdimension",
  };

  if (commands[key]) {
    e.preventDefault();

    runMobileCommand(
      commands[key]
    );

    return;
  }
}

/* =========================
   SPLINE ENTER
========================= */

if (
  e.key === "Enter" &&
  tool === "spline"
) {
  finishSpline();
  return;
}

/* =========================
   RIGHT CLICK = FINISH SPLINE
========================= */

if (
  tool === "spline" &&
  splinePoints.length >= 6
) {
  finishSpline();
  return;
}


  /* =========================
     ENTER = FINISH POLYLINE
  ========================= */

  if (
    e.key === "Enter"
  ) {
    finishPolyline();

    return;
  }
};

  /* =========================
     SELECT OBJECT
  ========================= */

  const selectObject = (
  index,
  event
) => {
  const multiSelect =
  event?.evt?.shiftKey ||
  event?.evt?.ctrlKey ||
  event?.evt?.metaKey;
  
  /* SELECT */

  if (tool === "select") {
    if (multiSelect) {
      setSelectedIndexes(
        (prev) => {
          if (
            prev.includes(index)
          ) {
            return prev.filter(
              (item) =>
                item !== index
            );
          }

          return [
            ...prev,
            index,
          ];
        }
      );

      setSelectedIndex(index);
      return;
    }

    setSelectedIndexes([
      index,
    ]);

    setSelectedIndex(index);
    return;
  }


  /* MOVE */

if (tool === "move") {
  startMove(index, event);
  return;
}
/* COPY */

if (tool === "copy") {

  copyObject(index, event);

  return;
}

  /* ROTATE */

  if (tool === "rotate") {
    rotateObject(index);
    return;
  }

/* TRIM */

if (tool === "trim") {
  if (trimFirstIndex === null) {
    setTrimFirstIndex(index);

    setSelectedIndex(index);

    setSelectedIndexes([
      index,
    ]);

    return;
  }

  if (trimFirstIndex === index) {
    return;
  }

  const boundaryIndex =
    trimFirstIndex;

  const targetIndex =
    index;

  const stage =
  e.target.getStage();

const pointer =
  stage?.getPointerPosition();

const clickPoint = pointer
  ? {
      x:
        (pointer.x - position.x) /
        scale,
      y:
        (pointer.y - position.y) /
        scale,
    }
  : null;

trimObject(
  boundaryIndex,
  targetIndex,
  clickPoint
);
  setTrimFirstIndex(null);

  return;
}

/* EXTEND */

if (tool === "extend") {
  if (extendFirstIndex === null) {
    setExtendFirstIndex(index);

    setSelectedIndex(index);

    setSelectedIndexes([
      index,
    ]);

    return;
  }

  if (extendFirstIndex === index) {
    return;
  }

  const boundaryIndex =
    extendFirstIndex;

  const targetIndex =
    index;

  extendObject(
    boundaryIndex,
    targetIndex
  );

  setExtendFirstIndex(null);

  return;
}

/* =========================
   LENGTHEN
========================= */

const lengthenObject = (index) => {
  const object = objects[index];

  if (!object) {
    return;
  }

  if (
    object.type !== "line"
  ) {
    window.alert(
      "LENGTHEN currently supports Line."
    );
    return;
  }

  if (
    object.locked ||
    isLayerLocked(
      object.layerId || "layer-0"
    )
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const points =
    Array.isArray(object.points)
      ? [...object.points]
      : [];

  if (points.length < 4) {
    return;
  }

  const x1 = points[0];
  const y1 = points[1];

  const x2 = points[2];
  const y2 = points[3];

  const dx = x2 - x1;
  const dy = y2 - y1;

  const length =
    Math.hypot(dx, dy);

  if (length < 0.000001) {
    return;
  }

  const extension = 50;

  const ux = dx / length;
  const uy = dy / length;

  const updatedObject = {
    ...object,
    points: [
      x1 - ux * extension,
      y1 - uy * extension,
      x2 + ux * extension,
      y2 + uy * extension,
    ],
  };

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (item, objectIndex) =>
        objectIndex === index
          ? updatedObject
          : item
    );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(index);
  setSelectedIndexes([index]);
  setFuture([]);
};

/* =========================
   SPLINE
========================= */

const createSpline = (points) => {
  if (
    !Array.isArray(points) ||
    points.length < 4
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const splineObject = {
    type: "spline",
    points: [...points],
    rotation: 0,
    color: "#ffffff",
    strokeWidth: 2,
    layerId: activeLayerId,
  };

  const newIndex =
    objects.length;

  setObjects([
    ...objects,
    splineObject,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setSelectedIndex(newIndex);
  setSelectedIndexes([newIndex]);
  setFuture([]);
};

/* =========================
   FINISH SPLINE
========================= */

const finishSpline = () => {
  if (
    !Array.isArray(splinePoints) ||
    splinePoints.length < 6
  ) {
    setSplinePoints([]);
    return;
  }

  createSpline(splinePoints);

  setSplinePoints([]);
};

/* STRETCH */

if (tool === "stretch") {
  if (isObjectLocked(index)) {
    window.alert(
      "This object is locked."
    );
    return;
  }

  setSelectedIndex(index);
  setSelectedIndexes([index]);

  window.alert(
    "Object selected. Use the yellow grip to stretch."
  );

  return;
}

 /* OFFSET */

if (tool === "offset") {
  offsetStartRef.current = {
    index,
    startX: null,
    startY: null,
    moved: false,
  };

  return;
}

  /* MIRROR */

  if (tool === "mirror") {
    mirrorObject(index);
    return;
  }

  /* SCALE */

  if (tool === "scale") {
    scaleObject(index);
    return;
  }

  /* EXPLODE */

  if (tool === "explode") {
    explodeObject(index);
    return;
  }

  /* =========================
   BREAK
========================= */

if (tool === "break") {
  breakObject(index);
  return;
}

  /* =========================
   BREAK
========================= */

const breakObject = (index) => {
  const object = objects[index];

  if (!object) {
    return;
  }

  if (object.locked) {
    window.alert("This object is locked.");
    return;
  }

  if (
    object.type !== "line" &&
    object.type !== "polyline"
  ) {
    window.alert(
      "BREAK currently supports Line and Polyline."
    );
    return;
  }

  const points = Array.isArray(object.points)
    ? [...object.points]
    : [];

  if (points.length < 4) {
    return;
  }

  const middle =
    Math.floor(points.length / 4) * 2;

  if (
    middle <= 0 ||
    middle >= points.length - 2
  ) {
    return;
  }

  const firstPoints =
    points.slice(0, middle + 2);

  const secondPoints =
    points.slice(middle);

  const firstObject = {
    ...object,
    points: firstPoints,
  };

  const secondObject = {
    ...object,
    points: secondPoints,
  };

  const updatedObjects = [
    ...objects.slice(0, index),
    firstObject,
    secondObject,
    ...objects.slice(index + 1),
  ];

  saveHistory(
    objects,
    measurements
  );

  setObjects(updatedObjects);

  setSelectedIndex(null);
  setSelectedIndexes([]);
};

/* =========================
   ALIGN
========================= */

const alignObject = (
  firstIndex,
  secondIndex
) => {
  const first = objects[firstIndex];
  const second = objects[secondIndex];

  if (
    firstIndex === null ||
    secondIndex === null ||
    firstIndex === secondIndex
  ) {
    window.alert(
      "Select two different objects for Align."
    );
    return;
  }

  if (!first || !second) {
    window.alert(
      "Selected objects were not found."
    );
    return;
  }

  if (
    first.locked ||
    second.locked
  ) {
    window.alert(
      "One or both selected objects are locked."
    );
    return;
  }

  const firstLayerId =
    first.layerId || "layer-0";

  const secondLayerId =
    second.layerId || "layer-0";

  if (
    isLayerLocked(firstLayerId) ||
    isLayerLocked(secondLayerId)
  ) {
    window.alert(
      "One or both objects are on locked layers."
    );
    return;
  }

  const firstBounds =
    getObjectBounds(first);

  const secondBounds =
    getObjectBounds(second);

  if (
    !firstBounds ||
    !secondBounds
  ) {
    window.alert(
      "Unable to calculate object bounds."
    );
    return;
  }

  /*
    ALIGN CENTER
    Second object is aligned
    to the center of first object.
  */

  const firstCenterX =
    (firstBounds.left +
      firstBounds.right) / 2;

  const firstCenterY =
    (firstBounds.top +
      firstBounds.bottom) / 2;

  const secondCenterX =
    (secondBounds.left +
      secondBounds.right) / 2;

  const secondCenterY =
    (secondBounds.top +
      secondBounds.bottom) / 2;

  const dx =
    firstCenterX -
    secondCenterX;

  const dy =
    firstCenterY -
    secondCenterY;

  if (
    !Number.isFinite(dx) ||
    !Number.isFinite(dy)
  ) {
    window.alert(
      "Invalid alignment coordinates."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const alignedObject = {
    ...second,
  };

  /*
    LINE
  */

  if (
    second.type === "line" &&
    Array.isArray(second.points) &&
    second.points.length >= 4
  ) {
    alignedObject.points = [
      second.points[0] + dx,
      second.points[1] + dy,
      second.points[2] + dx,
      second.points[3] + dy,
    ];
  }

  /*
    POLYLINE
  */

  else if (
    second.type === "polyline" &&
    Array.isArray(second.points)
  ) {
    alignedObject.points =
      second.points.map(
        (value, pointIndex) =>
          value +
          (pointIndex % 2 === 0
            ? dx
            : dy)
      );
  }

  /*
    CIRCLE / ARC / RECTANGLE / TEXT / HATCH
  */

  else {
    alignedObject.x =
      (Number(second.x) || 0) +
      dx;

    alignedObject.y =
      (Number(second.y) || 0) +
      dy;
  }

  const updatedObjects =
    objects.map(
      (object, objectIndex) =>
        objectIndex === secondIndex
          ? alignedObject
          : object
    );

  saveHistory(
    previousObjects,
    measurements
  );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    secondIndex
  );

  setSelectedIndexes([
    secondIndex,
  ]);
};

/* =========================
   ALIGN TOOL
========================= */

/* ALIGN */

if (tool === "align") {
  const currentSelection = [
    ...selectedIndexes,
  ];

  if (
    currentSelection.length === 0
  ) {
    setSelectedIndexes([
      index,
    ]);

    setSelectedIndex(index);

    return;
  }

  if (
    currentSelection[0] === index
  ) {
    return;
  }

  if (
    currentSelection.length === 1
  ) {
    const firstIndex =
      currentSelection[0];

    const secondIndex =
      index;

    alignObject(
      firstIndex,
      secondIndex
    );

    setSelectedIndexes([]);
    setSelectedIndex(null);

    changeTool("select");

    return;
  }
}

/* =========================
   GROUP
========================= */

const groupObjects = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length < 2) {
    window.alert(
      "Select at least two objects to group."
    );
    return;
  }

  const validIndexes = indexes.filter(
    (index) =>
      index >= 0 &&
      index < objects.length
  );

  if (validIndexes.length < 2) {
    window.alert(
      "Select at least two valid objects."
    );
    return;
  }

  const lockedObject = validIndexes.find(
    (index) =>
      isObjectLocked(index)
  );

  if (
    lockedObject !== undefined
  ) {
    window.alert(
      "One or more selected objects are locked."
    );
    return;
  }

  const groupId =
    `group-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        validIndexes.includes(index)
          ? {
              ...object,
              groupId,
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

  setSelectedIndexes(
    validIndexes
  );

  setSelectedIndex(
    validIndexes[
      validIndexes.length - 1
    ]
  );

  setFuture([]);
};

/* GROUP */

if (tool === "group") {
  groupObjects();
  return;
}

/* =========================
   UNGROUP
========================= */

const ungroupObjects = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length === 0) {
    window.alert(
      "Select a grouped object."
    );
    return;
  }

  const groupedIndexes =
    indexes.filter(
      (index) =>
        objects[index]?.groupId
    );

  if (groupedIndexes.length === 0) {
    window.alert(
      "Selected objects are not grouped."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const groupIds = new Set(
    groupedIndexes.map(
      (index) =>
        objects[index].groupId
    )
  );

  const updatedObjects =
    objects.map(
      (object) => {
        if (
          object.groupId &&
          groupIds.has(
            object.groupId
          )
        ) {
          const updated = {
            ...object,
          };

          delete updated.groupId;

          return updated;
        }

        return object;
      }
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};

/* UNGROUP */

if (tool === "ungroup") {
  ungroupObjects();
  return;
}

/* =========================
   BLOCK
========================= */

const createBlock = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length < 1) {
    window.alert(
      "Select at least one object to create a Block."
    );
    return;
  }

  const validIndexes = indexes.filter(
    (index) =>
      index >= 0 &&
      index < objects.length &&
      objects[index]
  );

  if (validIndexes.length === 0) {
    return;
  }

  const lockedObject = validIndexes.find(
    (index) =>
      isObjectLocked(index)
  );

  if (
    lockedObject !== undefined
  ) {
    window.alert(
      "One or more selected objects are locked."
    );
    return;
  }

  const blockId =
    `block-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        validIndexes.includes(index)
          ? {
              ...object,
              blockId,
              groupId:
                object.groupId ||
                blockId,
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

  setSelectedIndexes(
    validIndexes
  );

  setSelectedIndex(
    validIndexes[
      validIndexes.length - 1
    ]
  );

  setFuture([]);
};

/* BLOCK */

if (tool === "block") {
  createBlock();
  return;
}

/* =========================
   RENAME BLOCK
========================= */

const renameBlock = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length === 0) {
    window.alert(
      "Select a block first."
    );
    return;
  }

  const blockIndex =
    indexes.find(
      (index) =>
        objects[index]?.blockId
    );

  if (
    blockIndex === undefined
  ) {
    window.alert(
      "Selected object is not a Block."
    );
    return;
  }

  const blockId =
    objects[blockIndex].blockId;

  const newName =
    window.prompt(
      "Enter new Block name:",
      blockId
    );

  if (
    !newName ||
    !newName.trim()
  ) {
    return;
  }

  const trimmedName =
    newName.trim();

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) =>
        object.blockId === blockId
          ? {
              ...object,
              blockName:
                trimmedName,
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

  setFuture([]);
};

/* RENAME BLOCK */

if (tool === "renameblock") {
  renameBlock();
  return;
}

/* =========================
   DELETE BLOCK
========================= */

const deleteBlock = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length === 0) {
    window.alert(
      "Select a block first."
    );
    return;
  }

  const blockIds = new Set(
    indexes
      .map(
        (index) =>
          objects[index]?.blockId
      )
      .filter(Boolean)
  );

  if (blockIds.size === 0) {
    window.alert(
      "Selected object is not a Block."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.filter(
      (object) =>
        !(
          object.blockId &&
          blockIds.has(
            object.blockId
          )
        )
    );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setFuture([]);
};

/* DELETE BLOCK */

if (tool === "deleteblock") {
  deleteBlock();
  return;
}

/* =========================
   EXPLODE BLOCK
========================= */

const explodeBlock = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length === 0) {
    window.alert(
      "Select a block first."
    );
    return;
  }

  const blockIds = new Set(
    indexes
      .map(
        (index) =>
          objects[index]?.blockId
      )
      .filter(Boolean)
  );

  if (blockIds.size === 0) {
    window.alert(
      "Selected object is not a Block."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) => {
        if (
          object.blockId &&
          blockIds.has(
            object.blockId
          )
        ) {
          const updated = {
            ...object,
          };

          delete updated.blockId;
          delete updated.blockName;
          delete updated.groupId;

          return updated;
        }

        return object;
      }
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);

  setSelectedIndex(null);
  setSelectedIndexes([]);
};

/* EXPLODE BLOCK */

if (tool === "explodeblock") {
  explodeBlock();
  return;
}

/* =========================
   PURGE
========================= */

const purgeObjects = () => {
  const previousObjects = [
    ...objects,
  ];

  const usedBlockIds = new Set(
    objects
      .map(
        (object) =>
          object?.blockId
      )
      .filter(Boolean)
  );

  const updatedObjects =
    objects.map(
      (object) => {
        if (
          object.blockId &&
          !usedBlockIds.has(
            object.blockId
          )
        ) {
          const updated = {
            ...object,
          };

          delete updated.blockId;
          delete updated.blockName;

          return updated;
        }

        return object;
      }
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);

  window.alert(
    "Unused block data purged."
  );
};

/* PURGE */

if (tool === "purge") {
  purgeObjects();
  return;
}

/* =========================
   LAYER ISOLATE
========================= */

const isolateCurrentLayer = () => {
  const targetLayerId =
    activeLayerId || "layer-0";

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) => ({
        ...object,
        hidden:
          (object.layerId || "layer-0") !==
          targetLayerId,
      })
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);

  setFuture([]);
};

/* LAYER ISOLATE */

if (tool === "layerisolate") {
  isolateCurrentLayer();
  return;
}

/* =========================
   LAYER OFF
========================= */

const turnLayerOff = () => {
  const targetLayerId =
    activeLayerId || "layer-0";

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) =>
        (object.layerId || "layer-0") ===
        targetLayerId
          ? {
              ...object,
              hidden: true,
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

  setSelectedIndex(null);
  setSelectedIndexes([]);

  setFuture([]);
};

/* LAYER OFF */

if (tool === "layeroff") {
  turnLayerOff();
  return;
}

/* =========================
   LAYER ON
========================= */

const turnLayerOn = () => {
  const targetLayerId =
    activeLayerId || "layer-0";

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) =>
        (object.layerId || "layer-0") ===
        targetLayerId
          ? {
              ...object,
              hidden: false,
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

  setSelectedIndex(null);
  setSelectedIndexes([]);

  setFuture([]);
};

/* LAYER ON */

if (tool === "layeron") {
  turnLayerOn();
  return;
}

/* =========================
   LAYER FREEZE
========================= */

const freezeCurrentLayer = () => {
  const targetLayerId =
    activeLayerId || "layer-0";

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) =>
        (object.layerId || "layer-0") ===
        targetLayerId
          ? {
              ...object,
              frozen: true,
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

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setFuture([]);
};

/* LAYER FREEZE */

if (tool === "layerfreeze") {
  freezeCurrentLayer();
  return;
}

/* =========================
   LAYER THAW
========================= */

const thawCurrentLayer = () => {
  const targetLayerId =
    activeLayerId || "layer-0";

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) =>
        (object.layerId || "layer-0") ===
        targetLayerId
          ? {
              ...object,
              frozen: false,
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

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setFuture([]);
};

/* LAYER THAW */

if (tool === "layerthaw") {
  thawCurrentLayer();
  return;
}

/* =========================
   LAYER MATCH
========================= */

const layerMatch = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length < 2) {
    window.alert(
      "Select source object and target object."
    );
    return;
  }

  const sourceIndex =
    indexes[0];

  const targetIndexes =
    indexes.slice(1);

  const sourceObject =
    objects[sourceIndex];

  if (!sourceObject) {
    window.alert(
      "Source object not found."
    );
    return;
  }

  const sourceLayerId =
    sourceObject.layerId ||
    "layer-0";

  const sourceLayer =
    layers.find(
      (layer) =>
        layer.id === sourceLayerId
    );

  if (!sourceLayer) {
    window.alert(
      "Source layer not found."
    );
    return;
  }

  const editableIndexes =
    targetIndexes.filter(
      (index) => {
        if (!objects[index]) {
          return false;
        }

        return !isObjectLocked(index);
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Target objects are locked."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const targetSet =
    new Set(editableIndexes);

  const updatedObjects =
    objects.map(
      (object, index) =>
        targetSet.has(index)
          ? {
              ...object,
              layerId:
                sourceLayerId,
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

  setFuture([]);

  setSelectedIndexes(
    editableIndexes
  );

  setSelectedIndex(
    editableIndexes[
      editableIndexes.length - 1
    ] ?? null
  );
};

/* LAYER MATCH */

if (tool === "layermatch") {
  layerMatch();
  return;
}

/* =========================
   LAYER MERGE
========================= */

const mergeLayers = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length < 2) {
    window.alert(
      "Select objects from at least two layers."
    );
    return;
  }

  const selectedLayerIds = [
    ...new Set(
      indexes
        .map(
          (index) =>
            objects[index]?.layerId ||
            "layer-0"
        )
    ),
  ];

  if (selectedLayerIds.length < 2) {
    window.alert(
      "Selected objects are already on the same layer."
    );
    return;
  }

  const targetLayerId =
    activeLayerId || "layer-0";

  const lockedLayer =
    selectedLayerIds.find(
      (layerId) =>
        isLayerLocked(layerId)
    );

  if (lockedLayer) {
    window.alert(
      "One of the selected layers is locked."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) =>
        selectedLayerIds.includes(
          object.layerId ||
          "layer-0"
        )
          ? {
              ...object,
              layerId:
                targetLayerId,
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

  setFuture([]);

  setSelectedIndexes(
    indexes
  );

  setSelectedIndex(
    indexes[indexes.length - 1]
  );
};

/* LAYER MERGE */

if (tool === "layermerge") {
  mergeLayers();
  return;
}

/* =========================
   LAYER UNISOLATE
========================= */

const unisolateLayers = () => {
  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object) => ({
        ...object,
        hidden: false,
      })
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setFuture([]);
};

/* LAYER UNISOLATE */

if (tool === "layerunisolate") {
  unisolateLayers();
  return;
}

/* =========================
   LAYOUT
========================= */

const createLayout = () => {
  const layoutName = window.prompt(
    "Enter Layout name:",
    "Layout1"
  );

  if (
    layoutName === null ||
    !layoutName.trim()
  ) {
    return;
  }

  const trimmedName =
    layoutName.trim();

  const existingLayout =
    layouts?.find?.(
      (layout) =>
        layout?.name?.toLowerCase() ===
        trimmedName.toLowerCase()
    );

  if (existingLayout) {
    window.alert(
      "A layout with this name already exists."
    );
    return;
  }

  if (
    typeof setLayouts !== "function"
  ) {
    window.alert(
      "Layout system is not available yet."
    );
    return;
  }

  setLayouts(
    (previousLayouts) => [
      ...(previousLayouts || []),
      {
        id:
          `layout-${Date.now()}`,
        name:
          trimmedName,
      },
    ]
  );
};

/* LAYOUT */

if (tool === "layout") {
  createLayout();
  return;
}

/* =========================
   MATCH PROPERTIES
========================= */

const matchProperties = () => {
  const indexes = [
    ...selectedIndexes,
  ];

  if (indexes.length < 2) {
    window.alert(
      "Select source object first, then target object(s)."
    );
    return;
  }

  const sourceIndex =
    indexes[0];

  const targetIndexes =
    indexes.slice(1);

  const sourceObject =
    objects[sourceIndex];

  if (!sourceObject) {
    window.alert(
      "Source object not found."
    );
    return;
  }

  if (
    sourceObject.locked ||
    isLayerLocked(
      sourceObject.layerId ||
      "layer-0"
    )
  ) {
    window.alert(
      "Source object or its layer is locked."
    );
    return;
  }

  const editableTargets =
    targetIndexes.filter(
      (index) => {
        const object =
          objects[index];

        if (!object) {
          return false;
        }

        if (
          object.locked ||
          isLayerLocked(
            object.layerId ||
            "layer-0"
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    editableTargets.length === 0
  ) {
    window.alert(
      "Target objects are locked."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const targetSet =
    new Set(
      editableTargets
    );

  const updatedObjects =
    objects.map(
      (object, index) => {
        if (
          !targetSet.has(index)
        ) {
          return object;
        }

        return {
          ...object,

          color:
            sourceObject.color,

          strokeWidth:
            sourceObject.strokeWidth,

          rotation:
            sourceObject.rotation || 0,

          ...(sourceObject.fill !==
            undefined
            ? {
                fill:
                  sourceObject.fill,
              }
            : {}),

          ...(sourceObject.opacity !==
            undefined
            ? {
                opacity:
                  sourceObject.opacity,
              }
            : {}),

          ...(sourceObject.fontSize !==
            undefined
            ? {
                fontSize:
                  sourceObject.fontSize,
              }
            : {}),

          ...(sourceObject.hatchSpacing !==
            undefined
            ? {
                hatchSpacing:
                  sourceObject.hatchSpacing,
              }
            : {}),

          ...(sourceObject.hatchAngle !==
            undefined
            ? {
                hatchAngle:
                  sourceObject.hatchAngle,
              }
            : {}),
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

  setSelectedIndexes(
    editableTargets
  );

  setSelectedIndex(
    editableTargets[
      editableTargets.length - 1
    ] ?? null
  );

  setFuture([]);
};

/* MATCH PROPERTIES */

if (tool === "matchprop") {
  matchProperties();
  return;
}

/* =========================
   OVERKILL
========================= */

const overkillObjects = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length < 2) {
    window.alert(
      "Select at least two objects."
    );
    return;
  }

  const selectedSet =
    new Set(indexes);

  const previousObjects = [
    ...objects,
  ];

  const seen = new Set();
  const removeIndexes = new Set();

  indexes.forEach((index) => {
    const object = objects[index];

    if (!object) {
      return;
    }

    let key = "";

    if (
      object.type === "line" &&
      Array.isArray(object.points) &&
      object.points.length >= 4
    ) {
      const p1 = `${object.points[0]},${object.points[1]}`;
      const p2 = `${object.points[2]},${object.points[3]}`;

      key =
        p1 < p2
          ? `line:${p1}:${p2}`
          : `line:${p2}:${p1}`;
    }

    else if (
      object.type === "circle"
    ) {
      key =
        `circle:${object.x}:${object.y}:${object.radius}`;
    }

    else if (
      object.type === "rectangle"
    ) {
      key =
        `rectangle:${object.x}:${object.y}:${object.width}:${object.height}`;
    }

    else if (
      Array.isArray(object.points)
    ) {
      key =
        `${object.type}:${object.points.join(",")}`;
    }

    if (!key) {
      return;
    }

    if (seen.has(key)) {
      removeIndexes.add(index);
    } else {
      seen.add(key);
    }
  });

  if (
    removeIndexes.size === 0
  ) {
    window.alert(
      "No duplicate objects found."
    );
    return;
  }

  const updatedObjects =
    objects.filter(
      (_, index) =>
        !(
          selectedSet.has(index) &&
          removeIndexes.has(index)
        )
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setFuture([]);

  window.alert(
    `${removeIndexes.size} duplicate object(s) removed.`
  );
};

/* OVERKILL */

if (tool === "overkill") {
  overkillObjects();
  return;
}

/* =========================
   AUDIT
========================= */

const auditDrawing = () => {
  const errors = [];

  objects.forEach((object, index) => {
    if (!object) {
      errors.push(
        `Object ${index + 1}: empty object`
      );
      return;
    }

    if (!object.type) {
      errors.push(
        `Object ${index + 1}: missing type`
      );
      return;
    }

    if (
      object.type === "line" ||
      object.type === "polyline"
    ) {
      if (
        !Array.isArray(object.points) ||
        object.points.length < 4
      ) {
        errors.push(
          `Object ${index + 1}: invalid points`
        );
        return;
      }

      if (
        object.points.some(
          (value) =>
            !Number.isFinite(
              Number(value)
            )
        )
      ) {
        errors.push(
          `Object ${index + 1}: invalid coordinates`
        );
      }
    }

    if (
      object.type === "circle" ||
      object.type === "arc"
    ) {
      if (
        !Number.isFinite(
          Number(object.x)
        ) ||
        !Number.isFinite(
          Number(object.y)
        ) ||
        !Number.isFinite(
          Number(object.radius)
        ) ||
        Number(object.radius) <= 0
      ) {
        errors.push(
          `Object ${index + 1}: invalid radius/position`
        );
      }
    }

    if (
      object.type === "rectangle" ||
      object.type === "hatch"
    ) {
      if (
        !Number.isFinite(
          Number(object.x)
        ) ||
        !Number.isFinite(
          Number(object.y)
        ) ||
        !Number.isFinite(
          Number(object.width)
        ) ||
        !Number.isFinite(
          Number(object.height)
        )
      ) {
        errors.push(
          `Object ${index + 1}: invalid dimensions`
        );
      }
    }
  });

  if (errors.length === 0) {
    window.alert(
      `AUDIT complete.\n\n${objects.length} object(s) checked.\nNo errors found.`
    );
    return;
  }

  window.alert(
    `AUDIT found ${errors.length} issue(s):\n\n` +
    errors.slice(0, 20).join("\n")
  );
};

/* AUDIT */

if (tool === "audit") {
  auditDrawing();
  return;
}

/* =========================
   REGEN
========================= */

const regenDrawing = () => {
  const previousObjects = [...objects];
  const previousMeasurements = [...measurements];

  // Force fresh object references so Konva redraws everything
  setObjects(
    objects.map((object) => ({
      ...object,
      points: Array.isArray(object.points)
        ? [...object.points]
        : object.points,
    }))
  );

  setMeasurements(
    measurements.map((measurement) => ({
      ...measurement,
    }))
  );

  saveHistory(
    previousObjects,
    previousMeasurements
  );

  setSnapPoint(null);
  setSnapType("");

  window.alert(
    `REGEN complete.\n\n${objects.length} object(s) regenerated.`
  );
};

/* REGEN */

if (tool === "regen") {
  regenDrawing();
  return;
}

/* =========================
   WIPEOUT
========================= */

const createWipeout = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert("Select an object first.");
    return;
  }

  const source = objects[indexes[0]];

  if (!source) {
    return;
  }

  let points = [];

  if (
    source.type === "rectangle"
  ) {
    const x = Number(source.x || 0);
    const y = Number(source.y || 0);
    const w = Number(source.width || 0);
    const h = Number(source.height || 0);

    points = [
      x, y,
      x + w, y,
      x + w, y + h,
      x, y + h,
    ];
  }

  else if (
    source.type === "polyline" &&
    Array.isArray(source.points)
  ) {
    points = [...source.points];
  }

  else if (
    source.type === "line" &&
    Array.isArray(source.points)
  ) {
    points = [...source.points];
  }

  if (points.length < 6) {
    window.alert(
      "WIPEOUT requires a rectangle or closed polyline boundary."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const wipeout = {
    type: "wipeout",
    points,
    closed: true,
    fill: "#111111",
    color: "#111111",
    strokeWidth: 0,
    layerId: activeLayerId,
  };

  setObjects([
    ...objects,
    wipeout,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  const newIndex =
    objects.length;

  setSelectedIndex(newIndex);
  setSelectedIndexes([newIndex]);
  setFuture([]);
};

/* WIPEOUT */

if (tool === "wipeout") {
  createWipeout();
  return;
}

/* =========================
   FLATTEN
========================= */

const flattenObjects = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert("Select object(s) first.");
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map((object, index) => {
      if (!indexes.includes(index)) {
        return object;
      }

      return {
        ...object,

        x: Number(object.x || 0),
        y: Number(object.y || 0),

        centerX: Number(
          object.centerX ?? object.x ?? 0
        ),

        centerY: Number(
          object.centerY ?? object.y ?? 0
        ),

        z: 0,
        elevation: 0,

        startZ: 0,
        endZ: 0,

        groupId: undefined,
        blockId: undefined,
        blockName: undefined,
      };
    });

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setObjects(
    updatedObjects
  );

  setSelectedIndexes(
    indexes
  );

  setSelectedIndex(
    indexes[indexes.length - 1]
  );
};

/* FLATTEN */

if (tool === "flatten") {
  flattenObjects();
  return;
}

/* =========================
   LIST
========================= */

const listObjects = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert("Select object(s) first.");
    return;
  }

  const details = indexes
    .map((index) => {
      const object = objects[index];

      if (!object) {
        return "";
      }

      return [
        `Object ${index + 1}`,
        `Type: ${object.type || "unknown"}`,
        `Layer: ${object.layerId || "layer-0"}`,
        `Color: ${object.color || object.stroke || "default"}`,
        `Stroke Width: ${object.strokeWidth ?? 1}`,
        `Position: X=${object.x ?? 0}, Y=${object.y ?? 0}`,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  window.alert(details);
};

/* LIST */

if (tool === "list") {
  listObjects();
  return;
}

/* =========================
   XCLIP
========================= */

const xclipObject = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert("Select object(s) first.");
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map((object, index) => {
      if (!indexes.includes(index)) {
        return object;
      }

      return {
        ...object,
        xclipEnabled: !object.xclipEnabled,
      };
    });

  setObjects(updatedObjects);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setSelectedIndexes(indexes);
  setSelectedIndex(indexes[0]);
};

/* XCLIP */

if (tool === "xclip") {
  xclipObject();
  return;
}

/* =========================
   BOUNDARY
========================= */

const createBoundary = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert("Select an object first.");
    return;
  }

  const source = objects[indexes[0]];

  if (!source) {
    return;
  }

  let boundary = null;

  /* RECTANGLE */
  if (source.type === "rectangle") {
    const x = Number(source.x || 0);
    const y = Number(source.y || 0);
    const width = Number(source.width || 0);
    const height = Number(source.height || 0);

    boundary = {
      type: "polyline",
      points: [
        x, y,
        x + width, y,
        x + width, y + height,
        x, y + height,
        x, y,
      ],
      closed: true,
      color: source.color || "#ffffff",
      strokeWidth: source.strokeWidth || 1,
      layerId: source.layerId || activeLayerId,
      rotation: 0,
    };
  }

  /* POLYLINE */
  else if (
    source.type === "polyline" &&
    Array.isArray(source.points)
  ) {
    const points = [...source.points];

    if (points.length < 6) {
      window.alert(
        "Polyline must contain at least 3 points."
      );
      return;
    }

    const firstX = points[0];
    const firstY = points[1];

    const lastX =
      points[points.length - 2];

    const lastY =
      points[points.length - 1];

    const closedPoints =
      Math.abs(firstX - lastX) < 0.001 &&
      Math.abs(firstY - lastY) < 0.001
        ? points
        : [
            ...points,
            firstX,
            firstY,
          ];

    boundary = {
      type: "polyline",
      points: closedPoints,
      closed: true,
      color: source.color || "#ffffff",
      strokeWidth: source.strokeWidth || 1,
      layerId: source.layerId || activeLayerId,
      rotation: source.rotation || 0,
    };
  }

  else {
    window.alert(
      "BOUNDARY currently supports Rectangle and Polyline."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const newIndex =
    objects.length;

  setObjects([
    ...objects,
    boundary,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setSelectedIndex(newIndex);
  setSelectedIndexes([newIndex]);
  setFuture([]);
};

/* BOUNDARY */

if (tool === "boundary") {
  createBoundary();
  return;
}

/* =========================
   DIVIDE
========================= */

const divideObject = (index) => {
  const object = objects[index];

  if (!object) {
    return;
  }

  if (object.locked) {
    window.alert("This object is locked.");
    return;
  }

  if (
    object.type !== "line" &&
    object.type !== "polyline"
  ) {
    window.alert(
      "DIVIDE currently supports Line and Polyline."
    );
    return;
  }

  const points = Array.isArray(object.points)
    ? [...object.points]
    : [];

  if (points.length < 4) {
    return;
  }

  const parts = 2;

  const newObjects = [];

  for (
    let i = 0;
    i < points.length - 2;
    i += 2
  ) {
    const x1 = points[i];
    const y1 = points[i + 1];

    const x2 = points[i + 2];
    const y2 = points[i + 3];

    const middleX =
      (x1 + x2) / 2;

    const middleY =
      (y1 + y2) / 2;

    newObjects.push({
      ...object,
      type: "line",
      points: [
        x1,
        y1,
        middleX,
        middleY,
      ],
    });

    newObjects.push({
      ...object,
      type: "line",
      points: [
        middleX,
        middleY,
        x2,
        y2,
      ],
    });
  }

  if (newObjects.length === 0) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects = [
    ...objects.slice(0, index),
    ...newObjects,
    ...objects.slice(index + 1),
  ];

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setObjects(updatedObjects);

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setFuture([]);
};

/* DIVIDE */

if (tool === "divide") {
  divideObject(index);
  return;
}

/* =========================
   LENGTHEN
========================= */

if (tool === "lengthen") {
  lengthenObject(index);
  return;
}


/* =========================
   POINT
========================= */

const createPoint = (x, y) => {
  const previousObjects = [
    ...objects,
  ];

  const pointObject = {
    type: "point",
    x: Number(x),
    y: Number(y),
    color: "#ffffff",
    strokeWidth: 1,
    radius: 4,
    layerId: activeLayerId,
  };

  const newIndex =
    objects.length;

  setObjects([
    ...objects,
    pointObject,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setSelectedIndex(newIndex);
  setSelectedIndexes([newIndex]);
  setFuture([]);
};

/* =========================
   POINT
========================= */

if (tool === "point") {
  const point = {
    x: mousePosition.x,
    y: mousePosition.y,
  };

  createPoint(
    point.x,
    point.y
  );

  return;
}

/* =========================
   SPLINE
========================= */

if (tool === "spline") {
  const newPoints = [
    ...splinePoints,
    x,
    y,
  ];

  if (newPoints.length < 6) {
    setSplinePoints(newPoints);
    return;
  }

  createSpline(newPoints);

  setSplinePoints([]);

  return;
}

/* =========================
   UNION
========================= */

if (tool === "union") {
  const currentSelection = [
    ...selectedIndexes,
  ];

  if (
    currentSelection.length === 0
  ) {
    setSelectedIndexes([
      index,
    ]);

    setSelectedIndex(
      index
    );

    return;
  }

  if (
    !currentSelection.includes(
      index
    )
  ) {
    setSelectedIndexes([
      ...currentSelection,
      index,
    ]);

    setSelectedIndex(
      index
    );

    return;
  }

  if (
    currentSelection.length >= 2
  ) {
    unionObjects();
    return;
  }
}


/* =========================
   INTERSECT
========================= */

if (tool === "intersect") {
  intersectObjects();
  return;
}

/* =========================
   SUBTRACT
========================= */

if (tool === "subtract") {
  subtractObjects();
  return;
}

 /* =========================
   JOIN - TOUCH FRIENDLY
========================= */

if (tool === "join") {
  const currentSelection = [
    ...selectedIndexes,
  ];

  /* FIRST OBJECT */
  if (
    currentSelection.length === 0
  ) {
    setSelectedIndexes([
      index,
    ]);

    setSelectedIndex(
      index
    );

    return;
  }

  /* SAME OBJECT TAP */
  if (
    currentSelection.length === 1 &&
    currentSelection[0] === index
  ) {
    return;
  }

  /* SECOND OBJECT */
  if (
    currentSelection.length === 1
  ) {
    const firstIndex =
      currentSelection[0];

    const secondIndex =
      index;

    /* KEEP BOTH SELECTED
       WHILE JOIN RUNS */
    setSelectedIndexes([
      firstIndex,
      secondIndex,
    ]);

    setSelectedIndex(
      secondIndex
    );

   /* CHECK OBJECT TYPES */
const firstObject = objects[firstIndex];
const secondObject = objects[secondIndex];

if (
  !firstObject ||
  !secondObject
) {
  window.alert("Objects not found.");
  return;
}

const supportedTypes = [
  "line",
  "polyline",
  "arc",
  "hatch",
];

if (
  !supportedTypes.includes(firstObject.type) ||
  !supportedTypes.includes(secondObject.type)
) {
  window.alert(
    "Join supports Line + Line, Polyline + Line, Arc + Arc, and Hatch + Hatch."
  );
  return;
}

joinObject(
  firstIndex,
  secondIndex
);

changeTool("select");

return;
  }

  /* SAFETY */
  window.alert(
    "Join requires exactly two objects."
  );

  setSelectedIndexes([]);

  setSelectedIndex(null);

  return;
}

  /* FILLET */

  if (tool === "fillet") {
    if (
      commandFirstIndex ===
      null
    ) {
      setCommandFirstIndex(
        index
      );

      setSelectedIndex(
        index
      );

      return;
    }

    if (
      commandFirstIndex ===
      index
    ) {
      return;
    }

    filletObject(
      commandFirstIndex,
      index
    );

    setCommandFirstIndex(
      null
    );

    return;
  }

  /* CHAMFER */

  if (tool === "chamfer") {
    if (
      commandFirstIndex ===
      null
    ) {
      setCommandFirstIndex(
        index
      );

      setSelectedIndex(
        index
      );

      return;
    }

    if (
      commandFirstIndex ===
      index
    ) {
      return;
    }

    chamferObject(
      commandFirstIndex,
      index
    );

    setCommandFirstIndex(
      null
    );

    return;
  }

  /* ARRAY */

  if (tool === "array") {
    arrayObject(index);
    return;
  }
};

/* POLAR ARRAY */

if (
  tool === "polarArray"
) {
  polarArrayObject(
    index
  );

  return;
}


 /* =========================
   COPY
========================= */

const copyObject = (index, event = null) => {
  const indexesToCopy =
    selectedIndexes.length > 1
      ? selectedIndexes
      : index !== null
      ? [index]
      : [];

  if (
    indexesToCopy.length === 0
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const copies = [];

  const editableIndexes =
  indexesToCopy.filter(
    (objectIndex) =>
      objects[objectIndex] &&
      !objects[objectIndex].locked
  );

if (
  editableIndexes.length === 0
) {
  window.alert(
    "Selected object is locked."
  );
  return;
}

  editableIndexes.forEach(
    (objectIndex) => {
      const original =
        objects[objectIndex];

      if (!original) return;

     const copied = {
  ...original,
  locked: false,
  hidden: false,
};
        
      /* CIRCLE */

      if (
        original.type === "circle"
      ) {
        copied.x += GRID_SIZE;
        copied.y += GRID_SIZE;
      }

      /* RECTANGLE */

      else if (
        original.type === "rectangle"
      ) {
        copied.x += GRID_SIZE;
        copied.y += GRID_SIZE;
      }

      /* LINE */

      else if (
        original.type === "line"
      ) {
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

      /* POLYLINE */

      else if (
        original.type ===
        "polyline"
      ) {
        copied.points =
          original.points.map(
            (value) =>
              value + GRID_SIZE
          );
      }

      /* =========================
   SPLINE
========================= */

if (
  object.type === "spline"
) {
  return (
    <React.Fragment key={index}>
      <Line
        {...commonProps}
        points={object.points}
        stroke={
          object.color ||
          "#ffffff"
        }
       strokeWidth={object.strokeWidth || 2}
strokeScaleEnabled={false}
        lineCap="round"
        lineJoin="round"
        tension={0.5}
        bezier={false}
      />
    </React.Fragment>
  );
}

/* =========================
   SPLINE
========================= */

if (
  object.type === "spline"
) {
  return (
    <React.Fragment key={index}>

      <Line
        {...commonProps}
        points={object.points}
        stroke={
          object.color ||
          "#ffffff"
        }
        strokeWidth={
          (object.strokeWidth || 2) /
          scale
        }
        lineCap="round"
        lineJoin="round"
        tension={0.5}
        bezier={false}
      />

      {/* SPLINE GRIPS */}

      {selectedIndex === index &&
        object.points.map(
          (point, pointIndex) => {

            if (
              pointIndex % 2 !== 0
            ) {
              return null;
            }

            return (
              <Circle
                key={pointIndex}
                x={
                  object.points[
                    pointIndex
                  ]
                }
                y={
                  object.points[
                    pointIndex + 1
                  ]
                }
                radius={6 / scale}
                fill="#00aaff"
                stroke="white"
                strokeWidth={2 / scale}
                draggable
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                }}
                onDragEnd={(e) =>
                  handleSplineGripDragEnd(
                    index,
                    pointIndex,
                    e
                  )
                }
              />
            );
          }
        )}

    </React.Fragment>
  );
}

      /* ARC */

      else if (
        original.type === "arc"
      ) {
        copied.x += GRID_SIZE;
        copied.y += GRID_SIZE;
      }

/* ELLIPSE */

else if (
  original.type === "ellipse"
) {
  copied.x += GRID_SIZE;
  copied.y += GRID_SIZE;
}

/* HATCH */

else if (
  original.type === "hatch"
) {
  copied.x += GRID_SIZE;
  copied.y += GRID_SIZE;
}

      /* TEXT */

      else if (
        original.type === "text"
      ) {
        copied.x += GRID_SIZE;
        copied.y += GRID_SIZE;
      }

      else {
        return;
      }

      copies.push(copied);
    }
  );

  if (
    copies.length === 0
  ) {
    return;
  }

  const newObjects = [
    ...objects,
    ...copies,
  ];

  setObjects(
    newObjects
  );

  const newIndexes =
    copies.map(
      (_, copyIndex) =>
        objects.length +
        copyIndex
    );

  setSelectedIndexes(
    newIndexes
  );

  setSelectedIndex(
    newIndexes[
      newIndexes.length - 1
    ]
  );

  /* =========================
     COPY TOUCH STATE
  ========================= */

  copyStartRef.current = {
  indexes: newIndexes,
  objects: newObjects,
  startPointer: null,
  moved: false,
};

/* =========================
   COPY START POINTER
========================= */

if (event) {
  const stage =
    event.target.getStage();

  if (stage) {
    const pointer =
      stage.getPointerPosition();

    if (pointer) {
      copyStartRef.current.startPointer = {
        x:
          (pointer.x - position.x) /
          scale,
        y:
          (pointer.y - position.y) /
          scale,
      };
    }
  }
}
  saveHistory(
    previousObjects,
    [...measurements]
  );
};
 
const rotateObject = (index) => {
  const indexesToRotate =
    selectedIndexes.length > 0
      ? selectedIndexes
      : index !== null
        ? [index]
        : [];

  if (
    indexesToRotate.length === 0
  ) {
    return;
  }

  const editableIndexes =
    indexesToRotate.filter(
      (objectIndex) =>
        objects[objectIndex] &&
        !objects[objectIndex].locked
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const angle =
    15 * (Math.PI / 180);

  const rotatePoint = (
    px,
    py,
    cx,
    cy
  ) => {
    const dx = px - cx;
    const dy = py - cy;

    return {
      x:
        cx +
        dx * Math.cos(angle) -
        dy * Math.sin(angle),

      y:
        cy +
        dx * Math.sin(angle) +
        dy * Math.cos(angle),
    };
  };

  const rotateSet =
    new Set(
      editableIndexes
    );

  const updatedObjects =
    objects.map(
      (
        object,
        objectIndex
      ) => {
        if (
          !rotateSet.has(
            objectIndex
          )
        ) {
          return object;
        }

        /* =====================
           LINE
        ===================== */

        if (
          object.type === "line" &&
          object.points?.length >= 4
        ) {
          const x1 =
            object.points[0];

          const y1 =
            object.points[1];

          const x2 =
            object.points[2];

          const y2 =
            object.points[3];

          const centerX =
            (x1 + x2) / 2;

          const centerY =
            (y1 + y2) / 2;

          const p1 =
            rotatePoint(
              x1,
              y1,
              centerX,
              centerY
            );

          const p2 =
            rotatePoint(
              x2,
              y2,
              centerX,
              centerY
            );

          return {
            ...object,

            points: [
              p1.x,
              p1.y,
              p2.x,
              p2.y,
            ],

            rotation: 0,
          };
        }

        /* =====================
           POLYLINE
        ===================== */

        if (
          object.type ===
            "polyline" &&
          object.points?.length >= 2
        ) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          for (
            let i = 0;
            i < object.points.length;
            i += 2
          ) {
            minX = Math.min(
              minX,
              object.points[i]
            );

            minY = Math.min(
              minY,
              object.points[i + 1]
            );

            maxX = Math.max(
              maxX,
              object.points[i]
            );

            maxY = Math.max(
              maxY,
              object.points[i + 1]
            );
          }

          const centerX =
            (minX + maxX) / 2;

          const centerY =
            (minY + maxY) / 2;

          const rotatedPoints =
            [];

          for (
            let i = 0;
            i < object.points.length;
            i += 2
          ) {
            const point =
              rotatePoint(
                object.points[i],
                object.points[i + 1],
                centerX,
                centerY
              );

            rotatedPoints.push(
              point.x,
              point.y
            );
          }

          return {
            ...object,

            points:
              rotatedPoints,

            rotation: 0,
          };
        }

        /* =====================
           RECTANGLE
        ===================== */

        if (
          object.type ===
          "rectangle"
        ) {
          const width =
            object.width || 0;

          const height =
            object.height || 0;

          const centerX =
            object.x +
            width / 2;

          const centerY =
            object.y +
            height / 2;

          const newX =
            centerX -
            (
              (width / 2) *
                Math.cos(angle) -
              (height / 2) *
                Math.sin(angle)
            );

          const newY =
            centerY -
            (
              (width / 2) *
                Math.sin(angle) +
              (height / 2) *
                Math.cos(angle)
            );

          return {
            ...object,

            x: newX,
            y: newY,

            rotation:
              (object.rotation || 0) +
              15,
          };
        }

        /* =====================
           CIRCLE
        ===================== */

        if (
          object.type ===
          "circle"
        ) {
          return {
            ...object,

            rotation:
              (object.rotation || 0) +
              15,
          };
        }

        /* =====================
           ARC
        ===================== */

        if (
          object.type === "arc"
        ) {
          return {
            ...object,

            angleStart:
              object.angleStart +
              angle,

            angleEnd:
              object.angleEnd +
              angle,

            rotation: 0,
          };
        }

        /* =====================
           TEXT
        ===================== */

        if (
          object.type === "text"
        ) {
          const fontSize =
            object.fontSize || 24;

          const width =
            fontSize * 5;

          const height =
            fontSize;

          const centerX =
            object.x +
            width / 2;

          const centerY =
            object.y +
            height / 2;

          const newX =
            centerX -
            (
              (width / 2) *
                Math.cos(angle) -
              (height / 2) *
                Math.sin(angle)
            );

          const newY =
            centerY -
            (
              (width / 2) *
                Math.sin(angle) +
              (height / 2) *
                Math.cos(angle)
            );

          return {
            ...object,

            x: newX,
            y: newY,

            rotation:
              (object.rotation || 0) +
              15,
          };
        }

        return {
          ...object,

          rotation:
            (object.rotation || 0) +
            15,
        };
      }
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndexes(
    editableIndexes
  );

  setSelectedIndex(
    editableIndexes[
      editableIndexes.length - 1
    ]
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );
};

const getLineIntersection = (
  line1,
  line2
) => {
  if (
    !line1 ||
    !line2 ||
    line1.type !== "line" ||
    line2.type !== "line"
  ) {
    return null;
  }

  const x1 = line1.points[0];
  const y1 = line1.points[1];
  const x2 = line1.points[2];
  const y2 = line1.points[3];

  const x3 = line2.points[0];
  const y3 = line2.points[1];
  const x4 = line2.points[2];
  const y4 = line2.points[3];

  const denominator =
    (x1 - x2) * (y3 - y4) -
    (y1 - y2) * (x3 - x4);

  /* Parallel lines */
  if (Math.abs(denominator) < 0.000001) {
    return null;
  }

  const t =
    ((x1 - x3) * (y3 - y4) -
      (y1 - y3) * (x3 - x4)) /
    denominator;

  const u =
    -(
      (x1 - x2) * (y1 - y3) -
      (y1 - y2) * (x1 - x3)
    ) /
    denominator;

  /* Intersection outside either segment */
  if (
    t < 0 ||
    t > 1 ||
    u < 0 ||
    u > 1
  ) {
    return null;
  }

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
    t,
    u,
  };
};

/* =========================
   INFINITE LINE INTERSECTION
========================= */

const getInfiniteLineIntersection = (
  line1,
  line2
) => {
  if (
    !line1 ||
    !line2 ||
    line1.type !== "line" ||
    line2.type !== "line"
  ) {
    return null;
  }

  if (
    !Array.isArray(line1.points) ||
    line1.points.length < 4 ||
    !Array.isArray(line2.points) ||
    line2.points.length < 4
  ) {
    return null;
  }

  const x1 =
    Number(line1.points[0]);

  const y1 =
    Number(line1.points[1]);

  const x2 =
    Number(line1.points[2]);

  const y2 =
    Number(line1.points[3]);

  const x3 =
    Number(line2.points[0]);

  const y3 =
    Number(line2.points[1]);

  const x4 =
    Number(line2.points[2]);

  const y4 =
    Number(line2.points[3]);

  if (
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y2) ||
    !Number.isFinite(x3) ||
    !Number.isFinite(y3) ||
    !Number.isFinite(x4) ||
    !Number.isFinite(y4)
  ) {
    return null;
  }

  const denominator =
    (x1 - x2) *
      (y3 - y4) -
    (y1 - y2) *
      (x3 - x4);

  /* =========================
     PARALLEL LINES
  ========================= */

  if (
    Math.abs(denominator) <
    0.000001
  ) {
    return null;
  }

  const t =
    (
      (x1 - x3) *
        (y3 - y4) -
      (y1 - y3) *
        (x3 - x4)
    ) /
    denominator;

  const x =
    x1 +
    t * (x2 - x1);

  const y =
    y1 +
    t * (y2 - y1);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(t)
  ) {
    return null;
  }

  return {
    x,
    y,
    t,
  };
};


/* =========================
   LINE + ARC INTERSECTIONS
========================= */

const getLineArcIntersections = (
  line,
  arc
) => {
  if (
    !line ||
    !arc ||
    line.type !== "line" ||
    arc.type !== "arc"
  ) {
    return [];
  }

  if (
    !Array.isArray(line.points) ||
    line.points.length < 4
  ) {
    return [];
  }

  if (
    !Number.isFinite(
      Number(arc.x)
    ) ||
    !Number.isFinite(
      Number(arc.y)
    ) ||
    !Number.isFinite(
      Number(arc.radius)
    ) ||
    !Number.isFinite(
      Number(arc.angleStart)
    ) ||
    !Number.isFinite(
      Number(arc.angleEnd)
    )
  ) {
    return [];
  }

  const x1 =
    Number(line.points[0]);

  const y1 =
    Number(line.points[1]);

  const x2 =
    Number(line.points[2]);

  const y2 =
    Number(line.points[3]);

  if (
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y2)
  ) {
    return [];
  }

  const dx =
    x2 - x1;

  const dy =
    y2 - y1;

  const fx =
    x1 - Number(arc.x);

  const fy =
    y1 - Number(arc.y);

  const radius =
    Number(arc.radius);

  const a =
    dx * dx +
    dy * dy;

  /* =========================
     ZERO-LENGTH LINE
  ========================= */

  if (
    Math.abs(a) <
    0.000001
  ) {
    return [];
  }

  const b =
    2 *
    (
      fx * dx +
      fy * dy
    );

  const c =
    fx * fx +
    fy * fy -
    radius * radius;

  const discriminant =
    b * b -
    4 * a * c;

  /* =========================
     NO INTERSECTION
  ========================= */

  if (
    discriminant <
    -0.000001
  ) {
    return [];
  }

  const safeDiscriminant =
    Math.max(
      0,
      discriminant
    );

  const sqrtD =
    Math.sqrt(
      safeDiscriminant
    );

  const tValues = [
    (
      -b - sqrtD
    ) /
      (2 * a),

    (
      -b + sqrtD
    ) /
      (2 * a),
  ];

  const fullCircle =
    Math.PI * 2;

  let sweep =
    Number(arc.angleEnd) -
    Number(arc.angleStart);

  while (
    sweep < 0
  ) {
    sweep +=
      fullCircle;
  }

  sweep = Math.min(
    fullCircle,
    sweep
  );

  const intersections = [];

  tValues.forEach(
    (t) => {
      if (
        t < -0.000001 ||
        t > 1.000001
      ) {
        return;
      }

      const px =
        x1 +
        t * dx;

      const py =
        y1 +
        t * dy;

      const angle =
        Math.atan2(
          py - Number(arc.y),
          px - Number(arc.x)
        );

      let arcT =
        angle -
        Number(arc.angleStart);

      arcT =
        (
          (
            arcT %
            fullCircle
          ) +
          fullCircle
        ) %
        fullCircle;

      /* =========================
         OUTSIDE ARC
      ========================= */

      if (
        arcT >
        sweep +
          0.000001
      ) {
        return;
      }

      /* =========================
         DUPLICATE INTERSECTION
      ========================= */

      const duplicate =
        intersections.some(
          (point) =>
            Math.hypot(
              point.x - px,
              point.y - py
            ) <
            0.001
        );

      if (
        duplicate
      ) {
        return;
      }

      intersections.push({
        x: px,
        y: py,

        angle:
          Number(
            arc.angleStart
          ) +
          arcT,

        arcT,

        lineT:
          t,
      });
    }
  );

  return intersections;
};

/* =========================
   TRIM
========================= */

const trimObject = (
  boundaryIndex,
  targetIndex,
  clickPoint = null
) => {
  const boundary =
    objects[boundaryIndex];

  const target =
    objects[targetIndex];

    if (
  !target
) {
  return;
}

if (
  isObjectLocked(targetIndex)
) {
  window.alert(
    "Target object is locked."
  );
  return;
}

  if (!boundary || !target) {
    return;
  }
  if (isObjectLocked(targetIndex)) {
  window.alert(
    "Target object is locked."
  );
  return;
}

  /* =========================
     LINE + LINE
  ========================= */

  if (
    boundary.type === "line" &&
    target.type === "line"
  ) {
    const intersection =
      getLineIntersection(
        boundary,
        target
      );

    if (!intersection) {
      window.alert(
        "These two lines do not intersect."
      );
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const x1 =
      target.points[0];

    const y1 =
      target.points[1];

    const x2 =
      target.points[2];

    const y2 =
      target.points[3];

    const distanceToStart =
      Math.hypot(
        intersection.x - x1,
        intersection.y - y1
      );

    const distanceToEnd =
      Math.hypot(
        intersection.x - x2,
        intersection.y - y2
      );

    let trimmedTarget;

    if (
      distanceToStart <
      distanceToEnd
    ) {
      trimmedTarget = {
        ...target,

        points: [
          intersection.x,
          intersection.y,
          x2,
          y2,
        ],
      };
    } else {
      trimmedTarget = {
        ...target,

        points: [
          x1,
          y1,
          intersection.x,
          intersection.y,
        ],
      };
    }

    const updatedObjects =
      objects.map(
        (object, index) =>
          index === targetIndex
            ? trimmedTarget
            : object
      );

    setObjects(
      updatedObjects
    );

    setSelectedIndex(
      targetIndex
    );

    setSelectedIndexes([
      targetIndex,
    ]);

    setTrimFirstIndex(
      null
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

    /* =========================
     HATCH BOUNDARY + HATCH TARGET
  ========================= */

  if (
  boundary.type === "hatch" &&
  target.type === "hatch"
) {
  const boundaryX = boundary.x || 0;
  const boundaryY = boundary.y || 0;
  const boundaryW = boundary.width || 0;
  const boundaryH = boundary.height || 0;

  const targetX = target.x || 0;
  const targetY = target.y || 0;
  const targetW = target.width || 0;
  const targetH = target.height || 0;

  const overlapLeft = Math.max(
    boundaryX,
    targetX
  );

  const overlapTop = Math.max(
    boundaryY,
    targetY
  );

  const overlapRight = Math.min(
    boundaryX + boundaryW,
    targetX + targetW
  );

  const overlapBottom = Math.min(
    boundaryY + boundaryH,
    targetY + targetH
  );

  if (
    overlapLeft >= overlapRight ||
    overlapTop >= overlapBottom
  ) {
    window.alert(
      "The HATCH objects do not intersect."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedHatch = {
    ...target,

    trimEnabled: true,

    trimStartPoint: {
      x: overlapLeft,
      y: overlapTop,
    },

    trimEndPoint: {
      x: overlapRight,
      y: overlapBottom,
    },
  };

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedHatch
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

    /* =========================
     HATCH BOUNDARY + LINE TARGET
  ========================= */

  if (
    boundary.type === "hatch" &&
    target.type === "line"
  ) {
    const hx = boundary.x || 0;
    const hy = boundary.y || 0;
    const hw = boundary.width || 0;
    const hh = boundary.height || 0;

    const hatchLines = [
      {
        points: [
          hx,
          hy,
          hx + hw,
          hy,
        ],
      },
      {
        points: [
          hx + hw,
          hy,
          hx + hw,
          hy + hh,
        ],
      },
      {
        points: [
          hx + hw,
          hy + hh,
          hx,
          hy + hh,
        ],
      },
      {
        points: [
          hx,
          hy + hh,
          hx,
          hy,
        ],
      },
    ];

    const intersections = [];

    hatchLines.forEach(
      (hatchLine) => {
        const intersection =
          getLineIntersection(
            hatchLine,
            target
          );

        if (intersection) {
          intersections.push(
            intersection
          );
        }
      }
    );

    if (
      intersections.length === 0
    ) {
      window.alert(
        "The line does not intersect the HATCH boundary."
      );
      return;
    }

    const x1 =
      target.points[0];

    const y1 =
      target.points[1];

    const x2 =
      target.points[2];

    const y2 =
      target.points[3];

    let selectedIntersection =
      intersections[0];

    let shortestDistance =
      Math.min(
        Math.hypot(
          selectedIntersection.x -
            x1,
          selectedIntersection.y -
            y1
        ),
        Math.hypot(
          selectedIntersection.x -
            x2,
          selectedIntersection.y -
            y2
        )
      );

    intersections.forEach(
      (point) => {
        const distance =
          Math.min(
            Math.hypot(
              point.x - x1,
              point.y - y1
            ),
            Math.hypot(
              point.x - x2,
              point.y - y2
            )
          );

        if (
          distance <
          shortestDistance
        ) {
          shortestDistance =
            distance;

          selectedIntersection =
            point;
        }
      }
    );

    const previousObjects = [
      ...objects,
    ];

    const distanceToStart =
      Math.hypot(
        selectedIntersection.x -
          x1,
        selectedIntersection.y -
          y1
      );

    const distanceToEnd =
      Math.hypot(
        selectedIntersection.x -
          x2,
        selectedIntersection.y -
          y2
      );

    const trimmedTarget =
      distanceToStart <
      distanceToEnd
        ? {
            ...target,

            points: [
              selectedIntersection.x,
              selectedIntersection.y,
              x2,
              y2,
            ],
          }
        : {
            ...target,

            points: [
              x1,
              y1,
              selectedIntersection.x,
              selectedIntersection.y,
            ],
          };

    const updatedObjects =
      objects.map(
        (object, index) =>
          index === targetIndex
            ? trimmedTarget
            : object
      );

    setObjects(
      updatedObjects
    );

    setSelectedIndex(
      targetIndex
    );

    setSelectedIndexes([
      targetIndex,
    ]);

    setTrimFirstIndex(
      null
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  /* =========================
   HATCH BOUNDARY + CIRCLE TARGET
========================= */

if (
  boundary.type === "hatch" &&
  target.type === "circle"
) {
  const hx = boundary.x || 0;
  const hy = boundary.y || 0;
  const hw = boundary.width || 0;
  const hh = boundary.height || 0;

  const cx = target.x;
  const cy = target.y;
  const radius = target.radius;

  const edges = [
    { x1: hx, y1: hy, x2: hx + hw, y2: hy },
    { x1: hx + hw, y1: hy, x2: hx + hw, y2: hy + hh },
    { x1: hx + hw, y1: hy + hh, x2: hx, y2: hy + hh },
    { x1: hx, y1: hy + hh, x2: hx, y2: hy },
  ];

  const intersections = [];

  edges.forEach((edge) => {
    const dx = edge.x2 - edge.x1;
    const dy = edge.y2 - edge.y1;

    const fx = edge.x1 - cx;
    const fy = edge.y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c =
      fx * fx +
      fy * fy -
      radius * radius;

    const discriminant =
      b * b - 4 * a * c;

    if (discriminant < 0) {
      return;
    }

    const sqrtD =
      Math.sqrt(discriminant);

    const t1 =
      (-b - sqrtD) / (2 * a);

    const t2 =
      (-b + sqrtD) / (2 * a);

    if (t1 >= 0 && t1 <= 1) {
      intersections.push({
        x: edge.x1 + t1 * dx,
        y: edge.y1 + t1 * dy,
      });
    }

    if (
      t2 >= 0 &&
      t2 <= 1 &&
      Math.abs(t2 - t1) > 0.0001
    ) {
      intersections.push({
        x: edge.x1 + t2 * dx,
        y: edge.y1 + t2 * dy,
      });
    }
  });

  const uniqueIntersections =
    intersections.filter(
      (point, index, arr) =>
        arr.findIndex(
          (p) =>
            Math.abs(p.x - point.x) < 0.001 &&
            Math.abs(p.y - point.y) < 0.001
        ) === index
    );

  if (uniqueIntersections.length < 2) {
    window.alert(
      "The circle does not cross the HATCH boundary at two points."
    );
    return;
  }

  const angles =
    uniqueIntersections.map((point) =>
      Math.atan2(
        point.y - cy,
        point.x - cx
      )
    );

  const normalizeAngle = (angle) => {
    let value =
      angle % (Math.PI * 2);

    if (value < 0) {
      value += Math.PI * 2;
    }

    return value;
  };

  const a1 =
    normalizeAngle(angles[0]);

  const a2 =
    normalizeAngle(angles[1]);

    let trimStart = a1;
let trimEnd = a2;

if (clickPoint) {
  const clickAngle = normalizeAngle(
    Math.atan2(
      clickPoint.y - cy,
      clickPoint.x - cx
    )
  );

  const angleOnArc = (
    angle,
    start,
    end
  ) => {
    const full =
      Math.PI * 2;

    const normalizedStart =
      normalizeAngle(start);

    const normalizedEnd =
      normalizeAngle(end);

    const normalizedAngle =
      normalizeAngle(angle);

    const span =
      (normalizedEnd -
        normalizedStart +
        full) %
      full;

    const fromStart =
      (normalizedAngle -
        normalizedStart +
        full) %
      full;

    return fromStart <= span;
  };

  if (
    angleOnArc(
      clickAngle,
      a1,
      a2
    )
  ) {
    trimStart = a2;
    trimEnd = a1;
  }
}


  const previousObjects = [
    ...objects,
  ];

  const updatedCircle = {
  ...target,
  trimStartAngle: trimStart,
  trimEndAngle: trimEnd,
  trimEnabled: true,
};

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedCircle
          : object
    );

  setObjects(updatedObjects);

  setSelectedIndex(targetIndex);

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(null);

  // HATCH TRIM DATA - CIRCLE
if (
  boundary.type === "hatch" &&
  target.type === "circle" &&
  clickPoint
) {
  const updatedHatch = {
    ...boundary,
    trimEnabled: true,
    trimStartPoint: {
      x: clickPoint.x - 20,
      y: clickPoint.y - 20,
    },
    trimEndPoint: {
      x: clickPoint.x + 20,
      y: clickPoint.y + 20,
    },
  };

  updatedObjects[boundaryIndex] = updatedHatch;
}

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

/* =========================
   HATCH BOUNDARY + ARC TARGET
========================= */

if (
  boundary.type === "hatch" &&
  target.type === "arc"
) {
  const hx = boundary.x || 0;
  const hy = boundary.y || 0;
  const hw = boundary.width || 0;
  const hh = boundary.height || 0;

  const cx =
    target.x ??
    target.centerX ??
    0;

  const cy =
    target.y ??
    target.centerY ??
    0;

  const radius =
    target.radius || 0;

  if (radius <= 0) {
    window.alert(
      "Invalid ARC radius."
    );
    return;
  }

  const hatchEdges = [
    {
      x1: hx,
      y1: hy,
      x2: hx + hw,
      y2: hy,
    },
    {
      x1: hx + hw,
      y1: hy,
      x2: hx + hw,
      y2: hy + hh,
    },
    {
      x1: hx + hw,
      y1: hy + hh,
      x2: hx,
      y2: hy + hh,
    },
    {
      x1: hx,
      y1: hy + hh,
      x2: hx,
      y2: hy,
    },
  ];

  const intersections = [];

  hatchEdges.forEach(
    (edge) => {
      const dx =
        edge.x2 - edge.x1;

      const dy =
        edge.y2 - edge.y1;

      const fx =
        edge.x1 - cx;

      const fy =
        edge.y1 - cy;

      const a =
        dx * dx +
        dy * dy;

      const b =
        2 *
        (fx * dx + fy * dy);

      const c =
        fx * fx +
        fy * fy -
        radius * radius;

      const discriminant =
        b * b -
        4 * a * c;

      if (
        discriminant < 0
      ) {
        return;
      }

      const sqrtD =
        Math.sqrt(
          discriminant
        );

      const t1 =
        (-b - sqrtD) /
        (2 * a);

      const t2 =
        (-b + sqrtD) /
        (2 * a);

      [t1, t2].forEach(
        (t) => {
          if (
            t >= 0 &&
            t <= 1
          ) {
            intersections.push({
              x:
                edge.x1 +
                t * dx,

              y:
                edge.y1 +
                t * dy,
            });
          }
        }
      );
    }
  );

  const uniqueIntersections =
    intersections.filter(
      (point, index, arr) =>
        arr.findIndex(
          (p) =>
            Math.abs(
              p.x - point.x
            ) < 0.001 &&
            Math.abs(
              p.y - point.y
            ) < 0.001
        ) === index
    );

  if (
    uniqueIntersections.length <
    2
  ) {
    window.alert(
      "The ARC does not have enough intersections with the HATCH boundary."
    );
    return;
  }

  const normalizeAngle =
    (angle) =>
      (
        angle +
        Math.PI * 2
      ) %
      (Math.PI * 2);

  const arcStart =
    normalizeAngle(
      target.angleStart ??
        target.startAngle ??
        0
    );

  const arcEnd =
    normalizeAngle(
      target.angleEnd ??
        target.endAngle ??
        Math.PI * 2
    );

  const full =
    Math.PI * 2;

  const arcSpan =
    (
      arcEnd -
      arcStart +
      full
    ) % full;

  const angleOnArc =
    (angle) => {
      const a =
        normalizeAngle(
          angle
        );

      const fromStart =
        (
          a -
          arcStart +
          full
        ) % full;

      return (
        fromStart <=
        arcSpan + 0.0001
      );
    };

  const arcIntersections =
    uniqueIntersections
      .map(
        (point) => ({
          ...point,
          angle:
            normalizeAngle(
              Math.atan2(
                point.y - cy,
                point.x - cx
              )
            ),
        })
      )
      .filter(
        (point) =>
          angleOnArc(
            point.angle
          )
      );

  if (
    arcIntersections.length <
    2
  ) {
    window.alert(
      "The HATCH boundary does not cut the ARC."
    );
    return;
  }

  let first =
    arcIntersections[0];

  let second =
    arcIntersections[1];

  if (clickPoint) {
    const sorted =
      [...arcIntersections].sort(
        (a, b) =>
          Math.hypot(
            a.x -
              clickPoint.x,
            a.y -
              clickPoint.y
          ) -
          Math.hypot(
            b.x -
              clickPoint.x,
            b.y -
              clickPoint.y
          )
      );

    first = sorted[0];
    second = sorted[1];
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedArc = {
    ...target,

    trimStartAngle:
      first.angle,

    trimEndAngle:
      second.angle,

    trimEnabled:
      true,
  };

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedArc
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(
    null
  );

  // HATCH TRIM DATA - ARC
if (
  boundary.type === "hatch" &&
  target.type === "arc" &&
  clickPoint
) {
  const updatedHatch = {
    ...boundary,
    trimEnabled: true,
    trimStartPoint: {
      x: clickPoint.x - 20,
      y: clickPoint.y - 20,
    },
    trimEndPoint: {
      x: clickPoint.x + 20,
      y: clickPoint.y + 20,
    },
  };

  updatedObjects[boundaryIndex] = updatedHatch;
}

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

/* =========================
   HATCH BOUNDARY + RECTANGLE TARGET
========================= */

if (
  boundary.type === "hatch" &&
  target.type === "rectangle"
) {
  const hx = boundary.x || 0;
  const hy = boundary.y || 0;
  const hw = boundary.width || 0;
  const hh = boundary.height || 0;

  const rx = target.x || 0;
  const ry = target.y || 0;
  const rw = target.width || 0;
  const rh = target.height || 0;

  const hatchEdges = [
    { x1: hx, y1: hy, x2: hx + hw, y2: hy },
    {
      x1: hx + hw,
      y1: hy,
      x2: hx + hw,
      y2: hy + hh,
    },
    {
      x1: hx + hw,
      y1: hy + hh,
      x2: hx,
      y2: hy + hh,
    },
    {
      x1: hx,
      y1: hy + hh,
      x2: hx,
      y2: hy,
    },
  ];

  const rectEdges = [
    { x1: rx, y1: ry, x2: rx + rw, y2: ry },
    {
      x1: rx + rw,
      y1: ry,
      x2: rx + rw,
      y2: ry + rh,
    },
    {
      x1: rx + rw,
      y1: ry + rh,
      x2: rx,
      y2: ry + rh,
    },
    {
      x1: rx,
      y1: ry + rh,
      x2: rx,
      y2: ry,
    },
  ];

  const lineIntersection = (
    a,
    b,
    c,
    d
  ) => {
    const denominator =
      (d.y - c.y) *
        (b.x - a.x) -
      (d.x - c.x) *
        (b.y - a.y);

    if (
      Math.abs(denominator) <
      0.000001
    ) {
      return null;
    }

    const ua =
      (
        (d.x - c.x) *
          (a.y - c.y) -
        (d.y - c.y) *
          (a.x - c.x)
      ) / denominator;

    const ub =
      (
        (b.x - a.x) *
          (a.y - c.y) -
        (b.y - a.y) *
          (a.x - c.x)
      ) / denominator;

    if (
      ua < 0 ||
      ua > 1 ||
      ub < 0 ||
      ub > 1
    ) {
      return null;
    }

    return {
      x:
        a.x +
        ua * (b.x - a.x),

      y:
        a.y +
        ua * (b.y - a.y),
    };
  };

  const intersections = [];

  hatchEdges.forEach(
    (hatchEdge) => {
      rectEdges.forEach(
        (rectEdge) => {
          const hit =
            lineIntersection(
              {
                x: hatchEdge.x1,
                y: hatchEdge.y1,
              },
              {
                x: hatchEdge.x2,
                y: hatchEdge.y2,
              },
              {
                x: rectEdge.x1,
                y: rectEdge.y1,
              },
              {
                x: rectEdge.x2,
                y: rectEdge.y2,
              }
            );

          if (hit) {
            intersections.push(hit);
          }
        }
      );
    }
  );

  const uniqueIntersections =
    intersections.filter(
      (point, index, arr) =>
        arr.findIndex(
          (p) =>
            Math.abs(
              p.x - point.x
            ) < 0.001 &&
            Math.abs(
              p.y - point.y
            ) < 0.001
        ) === index
    );

  if (
    uniqueIntersections.length === 0
  ) {
    window.alert(
      "The RECTANGLE does not intersect the HATCH boundary."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  /*
   * Rectangle and HATCH are both
   * closed rectangular boundaries.
   *
   * Store the intersection point so
   * the trim state remains associated
   * with the selected rectangle.
   */

  let trimPoint =
    uniqueIntersections[0];

  if (clickPoint) {
    trimPoint =
      [...uniqueIntersections].sort(
        (a, b) =>
          Math.hypot(
            a.x - clickPoint.x,
            a.y - clickPoint.y
          ) -
          Math.hypot(
            b.x - clickPoint.x,
            b.y - clickPoint.y
          )
      )[0];
  }

  const updatedRectangle = {
    ...target,

    trimPoint: {
      x: trimPoint.x,
      y: trimPoint.y,
    },

    trimEnabled: true,
  };

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedRectangle
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(
    null
  );

  // HATCH TRIM DATA
if (
  boundary.type === "hatch" &&
  target.type === "rectangle" &&
  clickPoint
) {
  const updatedHatch = {
    ...boundary,
    trimEnabled: true,
    trimStartPoint: {
      x: clickPoint.x - 20,
      y: clickPoint.y - 20,
    },
    trimEndPoint: {
      x: clickPoint.x + 20,
      y: clickPoint.y + 20,
    },
  };

  updatedObjects[boundaryIndex] = updatedHatch;
}

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

/* =========================
   RECTANGLE BOUNDARY + HATCH TARGET
========================= */

if (
  boundary.type === "rectangle" &&
  target.type === "hatch"
) {
  const rx = boundary.x || 0;
  const ry = boundary.y || 0;
  const rw = boundary.width || 0;
  const rh = boundary.height || 0;

  const hx = target.x || 0;
  const hy = target.y || 0;
  const hw = target.width || 0;
  const hh = target.height || 0;

  const rectangleEdges = [
    {
      x1: rx,
      y1: ry,
      x2: rx + rw,
      y2: ry,
    },
    {
      x1: rx + rw,
      y1: ry,
      x2: rx + rw,
      y2: ry + rh,
    },
    {
      x1: rx + rw,
      y1: ry + rh,
      x2: rx,
      y2: ry + rh,
    },
    {
      x1: rx,
      y1: ry + rh,
      x2: rx,
      y2: ry,
    },
  ];

  const hatchEdges = [
    {
      x1: hx,
      y1: hy,
      x2: hx + hw,
      y2: hy,
    },
    {
      x1: hx + hw,
      y1: hy,
      x2: hx + hw,
      y2: hy + hh,
    },
    {
      x1: hx + hw,
      y1: hy + hh,
      x2: hx,
      y2: hy + hh,
    },
    {
      x1: hx,
      y1: hy + hh,
      x2: hx,
      y2: hy,
    },
  ];

  const lineIntersection = (
    a,
    b,
    c,
    d
  ) => {
    const denominator =
      (d.y - c.y) *
        (b.x - a.x) -
      (d.x - c.x) *
        (b.y - a.y);

    if (
      Math.abs(denominator) <
      0.000001
    ) {
      return null;
    }

    const ua =
      (
        (d.x - c.x) *
          (a.y - c.y) -
        (d.y - c.y) *
          (a.x - c.x)
      ) / denominator;

    const ub =
      (
        (b.x - a.x) *
          (a.y - c.y) -
        (b.y - a.y) *
          (a.x - c.x)
      ) / denominator;

    if (
      ua < 0 ||
      ua > 1 ||
      ub < 0 ||
      ub > 1
    ) {
      return null;
    }

    return {
      x:
        a.x +
        ua * (b.x - a.x),

      y:
        a.y +
        ua * (b.y - a.y),
    };
  };

  const intersections = [];

  rectangleEdges.forEach(
    (rectEdge) => {
      hatchEdges.forEach(
        (hatchEdge) => {
          const hit =
            lineIntersection(
              {
                x: rectEdge.x1,
                y: rectEdge.y1,
              },
              {
                x: rectEdge.x2,
                y: rectEdge.y2,
              },
              {
                x: hatchEdge.x1,
                y: hatchEdge.y1,
              },
              {
                x: hatchEdge.x2,
                y: hatchEdge.y2,
              }
            );

          if (hit) {
            intersections.push(hit);
          }
        }
      );
    }
  );

  const uniqueIntersections =
    intersections.filter(
      (point, index, arr) =>
        arr.findIndex(
          (p) =>
            Math.abs(
              p.x - point.x
            ) < 0.001 &&
            Math.abs(
              p.y - point.y
            ) < 0.001
        ) === index
    );

  if (
    uniqueIntersections.length === 0
  ) {
    window.alert(
      "The RECTANGLE does not intersect the HATCH boundary."
    );
    return;
  }

  let trimPoint =
    uniqueIntersections[0];

  if (clickPoint) {
    trimPoint =
      [...uniqueIntersections].sort(
        (a, b) =>
          Math.hypot(
            a.x - clickPoint.x,
            a.y - clickPoint.y
          ) -
          Math.hypot(
            b.x - clickPoint.x,
            b.y - clickPoint.y
          )
      )[0];
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedHatch = {
    ...target,

    trimPoint: {
      x: trimPoint.x,
      y: trimPoint.y,
    },

    trimEnabled: true,
  };

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedHatch
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(
    null
  );

  // =========================
// RECTANGLE -> HATCH TRIM
// =========================
if (
  boundary.type === "rectangle" &&
  target.type === "hatch" &&
  clickPoint
) {
  const updatedHatch = {
    ...target,
    trimEnabled: true,
    trimStartPoint: {
      x: clickPoint.x - 20,
      y: clickPoint.y - 20,
    },
    trimEndPoint: {
      x: clickPoint.x + 20,
      y: clickPoint.y + 20,
    },
  };

  updatedObjects[targetIndex] = updatedHatch;
}

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

/* =========================
   ARC BOUNDARY + HATCH TARGET
========================= */

if (
  boundary.type === "arc" &&
  target.type === "hatch"
) {
  const cx =
    boundary.x ??
    boundary.centerX ??
    0;

  const cy =
    boundary.y ??
    boundary.centerY ??
    0;

  const radius =
    boundary.radius || 0;

  if (radius <= 0) {
    window.alert(
      "Invalid ARC radius."
    );
    return;
  }

  const hx = target.x || 0;
  const hy = target.y || 0;
  const hw = target.width || 0;
  const hh = target.height || 0;

  const hatchEdges = [
    {
      x1: hx,
      y1: hy,
      x2: hx + hw,
      y2: hy,
    },
    {
      x1: hx + hw,
      y1: hy,
      x2: hx + hw,
      y2: hy + hh,
    },
    {
      x1: hx + hw,
      y1: hy + hh,
      x2: hx,
      y2: hy + hh,
    },
    {
      x1: hx,
      y1: hy + hh,
      x2: hx,
      y2: hy,
    },
  ];

  const normalizeAngle =
    (angle) =>
      (
        angle +
        Math.PI * 2
      ) %
      (Math.PI * 2);

  const arcStart =
    normalizeAngle(
      boundary.angleStart ??
        boundary.startAngle ??
        0
    );

  const arcEnd =
    normalizeAngle(
      boundary.angleEnd ??
        boundary.endAngle ??
        Math.PI * 2
    );

  const full =
    Math.PI * 2;

  const arcSpan =
    (
      arcEnd -
      arcStart +
      full
    ) % full;

  const angleOnArc =
    (angle) => {
      const a =
        normalizeAngle(
          angle
        );

      const fromStart =
        (
          a -
          arcStart +
          full
        ) % full;

      return (
        fromStart <=
        arcSpan + 0.0001
      );
    };

  const intersections = [];

  hatchEdges.forEach(
    (edge) => {
      const dx =
        edge.x2 - edge.x1;

      const dy =
        edge.y2 - edge.y1;

      const fx =
        edge.x1 - cx;

      const fy =
        edge.y1 - cy;

      const a =
        dx * dx +
        dy * dy;

      const b =
        2 *
        (fx * dx +
          fy * dy);

      const c =
        fx * fx +
        fy * fy -
        radius * radius;

      const discriminant =
        b * b -
        4 * a * c;

      if (
        discriminant < 0
      ) {
        return;
      }

      const sqrtD =
        Math.sqrt(
          discriminant
        );

      const t1 =
        (-b - sqrtD) /
        (2 * a);

      const t2 =
        (-b + sqrtD) /
        (2 * a);

      [t1, t2].forEach(
        (t) => {
          if (
            t >= 0 &&
            t <= 1
          ) {
            const x =
              edge.x1 +
              t * dx;

            const y =
              edge.y1 +
              t * dy;

            const angle =
              normalizeAngle(
                Math.atan2(
                  y - cy,
                  x - cx
                )
              );

            if (
              angleOnArc(angle)
            ) {
              intersections.push({
                x,
                y,
                angle,
              });
            }
          }
        }
      );
    }
  );

  const uniqueIntersections =
    intersections.filter(
      (point, index, arr) =>
        arr.findIndex(
          (p) =>
            Math.abs(
              p.x - point.x
            ) < 0.001 &&
            Math.abs(
              p.y - point.y
            ) < 0.001
        ) === index
    );

  if (
    uniqueIntersections.length <
    2
  ) {
    window.alert(
      "The ARC does not intersect the HATCH boundary at two points."
    );
    return;
  }

  let first =
    uniqueIntersections[0];

  let second =
    uniqueIntersections[1];

  if (clickPoint) {
    const sorted =
      [...uniqueIntersections].sort(
        (a, b) =>
          Math.hypot(
            a.x -
              clickPoint.x,
            a.y -
              clickPoint.y
          ) -
          Math.hypot(
            b.x -
              clickPoint.x,
            b.y -
              clickPoint.y
          )
      );

    first = sorted[0];
    second = sorted[1];
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedHatch = {
    ...target,

    trimStartPoint: {
      x: first.x,
      y: first.y,
    },

    trimEndPoint: {
      x: second.x,
      y: second.y,
    },

    trimEnabled: true,
  };

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedHatch
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(
    null
  );

  // =========================
// ARC -> HATCH TRIM
// =========================
if (
  boundary.type === "arc" &&
  target.type === "hatch" &&
  clickPoint
) {
  const updatedHatch = {
    ...target,
    trimEnabled: true,
    trimStartPoint: {
      x: clickPoint.x - 20,
      y: clickPoint.y - 20,
    },
    trimEndPoint: {
      x: clickPoint.x + 20,
      y: clickPoint.y + 20,
    },
  };

  updatedObjects[targetIndex] = updatedHatch;
}

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

/* =========================
   POLYLINE BOUNDARY + HATCH TARGET
========================= */

if (
  boundary.type === "polyline" &&
  target.type === "hatch"
) {
  const hx = target.x || 0;
  const hy = target.y || 0;
  const hw = target.width || 0;
  const hh = target.height || 0;

  const hatchEdges = [
    {
      x1: hx,
      y1: hy,
      x2: hx + hw,
      y2: hy,
    },
    {
      x1: hx + hw,
      y1: hy,
      x2: hx + hw,
      y2: hy + hh,
    },
    {
      x1: hx + hw,
      y1: hy + hh,
      x2: hx,
      y2: hy + hh,
    },
    {
      x1: hx,
      y1: hy + hh,
      x2: hx,
      y2: hy,
    },
  ];

  const intersections = [];

  for (
    let i = 0;
    i < boundary.points.length - 2;
    i += 2
  ) {
    const polyA = {
      x: boundary.points[i],
      y: boundary.points[i + 1],
    };

    const polyB = {
      x: boundary.points[i + 2],
      y: boundary.points[i + 3],
    };

    hatchEdges.forEach(
      (edge) => {
        const hit =
          getLineIntersection(
            {
              points: [
                polyA.x,
                polyA.y,
                polyB.x,
                polyB.y,
              ],
            },
            {
              points: [
                edge.x1,
                edge.y1,
                edge.x2,
                edge.y2,
              ],
            }
          );

        if (hit) {
          intersections.push(hit);
        }
      }
    );
  }

  const uniqueIntersections =
    intersections.filter(
      (point, index, arr) =>
        arr.findIndex(
          (p) =>
            Math.abs(
              p.x - point.x
            ) < 0.001 &&
            Math.abs(
              p.y - point.y
            ) < 0.001
        ) === index
    );

  if (
    uniqueIntersections.length === 0
  ) {
    window.alert(
      "The POLYLINE does not intersect the HATCH boundary."
    );
    return;
  }

  let trimPoint =
    uniqueIntersections[0];

  if (clickPoint) {
    trimPoint =
      [...uniqueIntersections].sort(
        (a, b) =>
          Math.hypot(
            a.x - clickPoint.x,
            a.y - clickPoint.y
          ) -
          Math.hypot(
            b.x - clickPoint.x,
            b.y - clickPoint.y
          )
      )[0];
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedHatch = {
    ...target,

    trimPoint: {
      x: trimPoint.x,
      y: trimPoint.y,
    },

    trimEnabled: true,
  };

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedHatch
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

/* =========================
   HATCH BOUNDARY + POLYLINE TARGET
========================= */

if (
  boundary.type === "hatch" &&
  target.type === "polyline"
) {
  const hx = boundary.x || 0;
  const hy = boundary.y || 0;
  const hw = boundary.width || 0;
  const hh = boundary.height || 0;

  const hatchEdges = [
    {
      x1: hx,
      y1: hy,
      x2: hx + hw,
      y2: hy,
    },
    {
      x1: hx + hw,
      y1: hy,
      x2: hx + hw,
      y2: hy + hh,
    },
    {
      x1: hx + hw,
      y1: hy + hh,
      x2: hx,
      y2: hy + hh,
    },
    {
      x1: hx,
      y1: hy + hh,
      x2: hx,
      y2: hy,
    },
  ];

  const lineIntersection = (
    a,
    b,
    c,
    d
  ) => {
    const denominator =
      (d.y - c.y) *
        (b.x - a.x) -
      (d.x - c.x) *
        (b.y - a.y);

    if (
      Math.abs(denominator) <
      0.000001
    ) {
      return null;
    }

    const ua =
      (
        (d.x - c.x) *
          (a.y - c.y) -
        (d.y - c.y) *
          (a.x - c.x)
      ) / denominator;

    const ub =
      (
        (b.x - a.x) *
          (a.y - c.y) -
        (b.y - a.y) *
          (a.x - c.x)
      ) / denominator;

    if (
      ua < 0 ||
      ua > 1 ||
      ub < 0 ||
      ub > 1
    ) {
      return null;
    }

    return {
      x:
        a.x +
        ua * (b.x - a.x),
      y:
        a.y +
        ua * (b.y - a.y),
      segmentT: ua,
    };
  };

  const intersections = [];

  for (
    let i = 0;
    i < target.points.length - 2;
    i += 2
  ) {
    const polyA = {
      x: target.points[i],
      y: target.points[i + 1],
    };

    const polyB = {
      x: target.points[i + 2],
      y: target.points[i + 3],
    };

    hatchEdges.forEach((edge) => {
      const hit =
        lineIntersection(
          polyA,
          polyB,
          {
            x: edge.x1,
            y: edge.y1,
          },
          {
            x: edge.x2,
            y: edge.y2,
          }
        );

      if (hit) {
        intersections.push({
          ...hit,
          segmentIndex: i / 2,
        });
      }
    });
  }

  if (
    intersections.length === 0
  ) {
    window.alert(
      "The POLYLINE does not intersect the HATCH boundary."
    );
    return;
  }

  const uniqueIntersections =
    intersections.filter(
      (point, index, arr) =>
        arr.findIndex(
          (p) =>
            Math.abs(
              p.x - point.x
            ) < 0.001 &&
            Math.abs(
              p.y - point.y
            ) < 0.001
        ) === index
    );

  if (
    uniqueIntersections.length <
    2
  ) {
    window.alert(
      "At least two HATCH intersections are required."
    );
    return;
  }

  let firstPoint =
    uniqueIntersections[0];

  let secondPoint =
    uniqueIntersections[1];

  if (clickPoint) {
    const sorted =
      [...uniqueIntersections].sort(
        (a, b) =>
          Math.hypot(
            a.x - clickPoint.x,
            a.y - clickPoint.y
          ) -
          Math.hypot(
            b.x - clickPoint.x,
            b.y - clickPoint.y
          )
      );

    firstPoint = sorted[0];

    secondPoint =
      sorted[1];
  }

  const firstSegment =
    firstPoint.segmentIndex;

  const secondSegment =
    secondPoint.segmentIndex;

  if (
    firstSegment === secondSegment
  ) {
    const points = [
      ...target.points,
    ];

    const segmentStart =
      firstSegment * 2;

    const ax =
      points[segmentStart];

    const ay =
      points[segmentStart + 1];

    const bx =
      points[segmentStart + 2];

    const by =
      points[segmentStart + 3];

    const t1 =
      Math.min(
        firstPoint.segmentT,
        secondPoint.segmentT
      );

    const t2 =
      Math.max(
        firstPoint.segmentT,
        secondPoint.segmentT
      );

    const newPoints = [
      ...points.slice(
        0,
        segmentStart
      ),

      ax,
      ay,

      ax +
        (bx - ax) * t1,
      ay +
        (by - ay) * t1,

      ax +
        (bx - ax) * t2,
      ay +
        (by - ay) * t2,

      bx,
      by,

      ...points.slice(
        segmentStart + 4
      ),
    ];

    const previousObjects = [
      ...objects,
    ];

    const updatedObjects =
      objects.map(
        (object, index) =>
          index === targetIndex
            ? {
                ...target,
                points: newPoints,
              }
            : object
      );

    setObjects(
      updatedObjects
    );

    setSelectedIndex(
      targetIndex
    );

    setSelectedIndexes([
      targetIndex,
    ]);

    setTrimFirstIndex(
      null
    );

    // HATCH TRIM DATA - POLYLINE
if (
  boundary.type === "hatch" &&
  target.type === "polyline" &&
  clickPoint
) {
  const updatedHatch = {
    ...boundary,
    trimEnabled: true,
    trimStartPoint: {
      x: clickPoint.x - 20,
      y: clickPoint.y - 20,
    },
    trimEndPoint: {
      x: clickPoint.x + 20,
      y: clickPoint.y + 20,
    },
  };

  updatedObjects[boundaryIndex] = updatedHatch;
}

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedPoints = [
    ...target.points,
  ];

  const removeStart =
    Math.min(
      firstSegment,
      secondSegment
    );

  const removeEnd =
    Math.max(
      firstSegment,
      secondSegment
    );

  const startPoint =
    firstSegment <= secondSegment
      ? firstPoint
      : secondPoint;

  const endPoint =
    firstSegment <= secondSegment
      ? secondPoint
      : firstPoint;

  const newPoints = [];

  newPoints.push(
    target.points[0],
    target.points[1]
  );

  for (
    let i = 0;
    i < target.points.length - 2;
    i += 2
  ) {
    const segmentIndex =
      i / 2;

    if (
      segmentIndex <
      removeStart
    ) {
      newPoints.push(
        target.points[i + 2],
        target.points[i + 3]
      );
      continue;
    }

    if (
      segmentIndex ===
      removeStart
    ) {
      newPoints.push(
        startPoint.x,
        startPoint.y
      );
      continue;
    }

    if (
      segmentIndex ===
      removeEnd
    ) {
      newPoints.push(
        endPoint.x,
        endPoint.y
      );

      newPoints.push(
        target.points[i + 2],
        target.points[i + 3]
      );

      continue;
    }

    if (
      segmentIndex >
      removeEnd
    ) {
      newPoints.push(
        target.points[i + 2],
        target.points[i + 3]
      );
    }
  }

  const cleanedPoints =
    newPoints.filter(
      (point, index, arr) =>
        index < 2 ||
        point !== arr[index - 2]
    );

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? {
              ...target,
              points: cleanedPoints,
            }
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

 /* =========================
   LINE BOUNDARY + HATCH TARGET
========================= */

if (
  boundary.type === "line" &&
  target.type === "hatch"
) {
  const bx1 = boundary.points[0];
  const by1 = boundary.points[1];

  const bx2 = boundary.points[2];
  const by2 = boundary.points[3];

  const hx = target.x || 0;
  const hy = target.y || 0;
  const hw = target.width || 0;
  const hh = target.height || 0;

  const hatchEdges = [
    {
      x1: hx,
      y1: hy,
      x2: hx + hw,
      y2: hy,
    },
    {
      x1: hx + hw,
      y1: hy,
      x2: hx + hw,
      y2: hy + hh,
    },
    {
      x1: hx + hw,
      y1: hy + hh,
      x2: hx,
      y2: hy + hh,
    },
    {
      x1: hx,
      y1: hy + hh,
      x2: hx,
      y2: hy,
    },
  ];

  const lineIntersection = (
    a,
    b,
    c,
    d
  ) => {
    const denominator =
      (d.y - c.y) *
        (b.x - a.x) -
      (d.x - c.x) *
        (b.y - a.y);

    if (
      Math.abs(denominator) <
      0.000001
    ) {
      return null;
    }

    const ua =
      (
        (d.x - c.x) *
          (a.y - c.y) -
        (d.y - c.y) *
          (a.x - c.x)
      ) / denominator;

    const ub =
      (
        (b.x - a.x) *
          (a.y - c.y) -
        (b.y - a.y) *
          (a.x - c.x)
      ) / denominator;

    if (
      ua < 0 ||
      ua > 1 ||
      ub < 0 ||
      ub > 1
    ) {
      return null;
    }

    return {
      x:
        a.x +
        ua * (b.x - a.x),

      y:
        a.y +
        ua * (b.y - a.y),

      t: ub,
    };
  };

  const intersections = [];

  hatchEdges.forEach(
    (edge) => {
      const hit =
        lineIntersection(
          {
            x: bx1,
            y: by1,
          },
          {
            x: bx2,
            y: by2,
          },
          {
            x: edge.x1,
            y: edge.y1,
          },
          {
            x: edge.x2,
            y: edge.y2,
          }
        );

      if (hit) {
        intersections.push(hit);
      }
    }
  );

  if (
    intersections.length === 0
  ) {
    window.alert(
      "The LINE does not intersect the HATCH boundary."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  /*
   * HATCH is stored as a rectangular
   * boundary. For a single LINE
   * intersection, use the intersection
   * to create the trimmed hatch side.
   */

  const point =
    clickPoint ||
    intersections[0];

  const distanceToStart =
    Math.hypot(
      point.x - bx1,
      point.y - by1
    );

  const distanceToEnd =
    Math.hypot(
      point.x - bx2,
      point.y - by2
    );

  const keepFromStart =
    distanceToStart <
    distanceToEnd;

  const trimX =
    Math.max(
      hx,
      Math.min(
        hx + hw,
        point.x
      )
    );

  const trimY =
    Math.max(
      hy,
      Math.min(
        hy + hh,
        point.y
      )
    );

  let updatedHatch = {
    ...target,
  };

  if (
    Math.abs(
      bx2 - bx1
    ) >
    Math.abs(
      by2 - by1
    )
  ) {
    updatedHatch = {
      ...target,
      x: Math.min(
        trimX,
        hx + hw
      ),
      width:
        Math.max(
          0,
          Math.max(
            hx,
            hx + hw
          ) -
            Math.min(
              trimX,
              hx + hw
            )
        ),
    };
  } else {
    updatedHatch = {
      ...target,
      y: Math.min(
        trimY,
        hy + hh
      ),
      height:
        Math.max(
          0,
          Math.max(
            hy,
            hy + hh
          ) -
            Math.min(
              trimY,
              hy + hh
            )
        ),
    };
  }

  if (
    updatedHatch.width <= 0 ||
    updatedHatch.height <= 0
  ) {
    window.alert(
      "TRIM would remove the entire HATCH."
    );
    return;
  }

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedHatch
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setTrimFirstIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

  /* =========================
     LINE BOUNDARY + ARC TARGET
  ========================= */

  if (
    boundary.type === "line" &&
    target.type === "arc"
  ) {
    const intersections =
      getLineArcIntersections(
        boundary,
        target
      );

    if (
      intersections.length === 0
    ) {
      window.alert(
        "The line and arc do not intersect."
      );
      return;
    }

    const sweep =
      target.angleEnd -
      target.angleStart;

    const positiveSweep =
      (
        (
          sweep %
          (Math.PI * 2)
        ) +
        Math.PI * 2
      ) %
      (Math.PI * 2);

    let selectedIntersection =
      intersections[0];

    let shortestDistance =
      Math.min(
        selectedIntersection.arcT,
        positiveSweep -
          selectedIntersection.arcT
      );

    intersections.forEach(
      (intersection) => {
        const distanceFromStart =
          intersection.arcT;

        const distanceFromEnd =
          positiveSweep -
          intersection.arcT;

        const endpointDistance =
          Math.min(
            distanceFromStart,
            distanceFromEnd
          );

        if (
          endpointDistance <
          shortestDistance
        ) {
          shortestDistance =
            endpointDistance;

          selectedIntersection =
            intersection;
        }
      }
    );

    const previousObjects = [
      ...objects,
    ];

    const distanceFromStart =
      selectedIntersection.arcT;

    const distanceFromEnd =
      positiveSweep -
      selectedIntersection.arcT;

    let trimmedTarget;

    if (
      distanceFromStart <
      distanceFromEnd
    ) {
      trimmedTarget = {
        ...target,

        angleStart:
          selectedIntersection.angle,
      };
    } else {
      trimmedTarget = {
        ...target,

        angleEnd:
          selectedIntersection.angle,
      };
    }

    const updatedObjects =
      objects.map(
        (object, index) =>
          index === targetIndex
            ? trimmedTarget
            : object
      );

    setObjects(
      updatedObjects
    );

    setSelectedIndex(
      targetIndex
    );

    setSelectedIndexes([
      targetIndex,
    ]);

    setTrimFirstIndex(
      null
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }
}
 
/* =========================
   EXTEND
========================= */
const extendObject = (
  boundaryIndex,
  targetIndex
) => {

  const boundary =
    objects[boundaryIndex];

  const target =
    objects[targetIndex];

  if (!boundary || !target) {
    return;
  }

  if (
    isObjectLocked(targetIndex)
  ) {
    window.alert(
      "Target object is locked."
    );
    return;
  }


  /* =========================
     LINE + LINE
  ========================= */

  if (
    boundary.type === "line" &&
    target.type === "line"
  ) {
    const intersection =
      getInfiniteLineIntersection(
        target,
        boundary
      );

    if (!intersection) {
      window.alert(
        "These two lines are parallel."
      );
      return;
    }

    if (
      intersection.t >= 0 &&
      intersection.t <= 1
    ) {
      window.alert(
        "The target line is already reaching the boundary."
      );
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const x1 =
      target.points[0];

    const y1 =
      target.points[1];

    const x2 =
      target.points[2];

    const y2 =
      target.points[3];

    let updatedTarget;

    if (
      intersection.t < 0
    ) {
      updatedTarget = {
        ...target,

        points: [
          intersection.x,
          intersection.y,
          x2,
          y2,
        ],
      };
    } else {
      updatedTarget = {
        ...target,

        points: [
          x1,
          y1,
          intersection.x,
          intersection.y,
        ],
      };
    }

    const updatedObjects =
      objects.map(
        (object, index) =>
          index === targetIndex
            ? updatedTarget
            : object
      );

    setObjects(
      updatedObjects
    );

    setSelectedIndex(
      targetIndex
    );

    setSelectedIndexes([
      targetIndex,
    ]);

    setExtendFirstIndex(
      null
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  /* =========================
     LINE BOUNDARY + ARC TARGET
  ========================= */

  if (
    boundary.type === "line" &&
    target.type === "arc"
  ) {
    const intersections =
      getInfiniteLineArcIntersections(
        boundary,
        target
      );

    if (
      intersections.length === 0
    ) {
      window.alert(
        "The boundary line does not intersect the arc."
      );
      return;
    }

    const fullCircle =
      Math.PI * 2;

    const sweep =
      target.angleEnd -
      target.angleStart;

    const direction =
      sweep >= 0
        ? 1
        : -1;

    const sweepSize =
      Math.abs(sweep);

    let bestIntersection =
      null;

    let bestDistance =
      Infinity;

    intersections.forEach(
      (intersection) => {
        let progress;

        if (
          direction > 0
        ) {
          progress =
            (
              (
                intersection.angle -
                target.angleStart
              ) %
                fullCircle +
              fullCircle
            ) %
            fullCircle;
        } else {
          progress =
            (
              (
                target.angleStart -
                intersection.angle
              ) %
                fullCircle +
              fullCircle
            ) %
            fullCircle;
        }

        /* Already on current arc */
        if (
          progress <=
          sweepSize +
            0.000001
        ) {
          return;
        }

        const distanceFromEnd =
          progress -
          sweepSize;

        const distanceFromStart =
          fullCircle -
          progress;

        const distance =
          Math.min(
            distanceFromEnd,
            distanceFromStart
          );

        if (
          distance <
          bestDistance
        ) {
          bestDistance =
            distance;

          bestIntersection = {
            ...intersection,
            progress,
          };
        }
      }
    );

    if (
      !bestIntersection
    ) {
      window.alert(
        "The arc already reaches the boundary."
      );
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const extendFromStart =
      fullCircle -
      bestIntersection.progress <
      bestIntersection.progress -
        sweepSize;

    let updatedTarget;

    if (
      extendFromStart
    ) {
      updatedTarget = {
        ...target,

        angleStart:
          bestIntersection.angle,
      };
    } else {
      updatedTarget = {
        ...target,

        angleEnd:
          bestIntersection.angle,
      };
    }

    const updatedObjects =
      objects.map(
        (object, index) =>
          index === targetIndex
            ? updatedTarget
            : object
      );

    setObjects(
      updatedObjects
    );

    setSelectedIndex(
      targetIndex
    );

    setSelectedIndexes([
      targetIndex,
    ]);

    setExtendFirstIndex(
      null
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  /* =========================
   ARC BOUNDARY + LINE TARGET
========================= */

if (
  boundary.type === "arc" &&
  target.type === "line"
) {
  const intersections =
    getInfiniteLineArcIntersections(
      target,
      boundary
    );

  if (
    intersections.length === 0
  ) {
    window.alert(
      "The boundary arc does not intersect the target line."
    );
    return;
  }

  const fullCircle =
    Math.PI * 2;

  const sweep =
    boundary.angleEnd -
    boundary.angleStart;

  const direction =
    sweep >= 0
      ? 1
      : -1;

  const sweepSize =
    Math.min(
      Math.abs(sweep),
      fullCircle
    );

  const visibleIntersections =
    intersections.filter(
      (intersection) => {
        let progress;

        if (
          direction > 0
        ) {
          progress =
            (
              (
                intersection.angle -
                boundary.angleStart
              ) %
                fullCircle +
              fullCircle
            ) %
            fullCircle;
        } else {
          progress =
            (
              (
                boundary.angleStart -
                intersection.angle
              ) %
                fullCircle +
              fullCircle
            ) %
            fullCircle;
        }

        return (
          progress <=
          sweepSize +
            0.000001
        );
      }
    );

  if (
    visibleIntersections.length === 0
  ) {
    window.alert(
      "The target line does not meet the visible part of the arc."
    );
    return;
  }

  let bestIntersection =
    null;

  let bestDistance =
    Infinity;

  visibleIntersections.forEach(
    (intersection) => {
      if (
        intersection.lineT >= 0 &&
        intersection.lineT <= 1
      ) {
        return;
      }

      const distance =
        intersection.lineT < 0
          ? -intersection.lineT
          : intersection.lineT - 1;

      if (
        distance <
        bestDistance
      ) {
        bestDistance =
          distance;

        bestIntersection =
          intersection;
      }
    }
  );

  if (
    !bestIntersection
  ) {
    window.alert(
      "The target line is already reaching the arc."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const x1 =
    target.points[0];

  const y1 =
    target.points[1];

  const x2 =
    target.points[2];

  const y2 =
    target.points[3];

  let updatedTarget;

  if (
    bestIntersection.lineT < 0
  ) {
    updatedTarget = {
      ...target,

      points: [
        bestIntersection.x,
        bestIntersection.y,
        x2,
        y2,
      ],
    };
  } else {
    updatedTarget = {
      ...target,

      points: [
        x1,
        y1,
        bestIntersection.x,
        bestIntersection.y,
      ],
    };
  }

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedTarget
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setExtendFirstIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

/* =========================
   ARC BOUNDARY + ARC TARGET
========================= */

if (
  boundary.type === "arc" &&
  target.type === "arc"
) {
  const TWO_PI =
    Math.PI * 2;

  /* =========================
     VALIDATE ARC DATA
  ========================= */

  if (
    !Number.isFinite(
      Number(boundary.x)
    ) ||
    !Number.isFinite(
      Number(boundary.y)
    ) ||
    !Number.isFinite(
      Number(boundary.radius)
    ) ||
    !Number.isFinite(
      Number(boundary.angleStart)
    ) ||
    !Number.isFinite(
      Number(boundary.angleEnd)
    ) ||
    !Number.isFinite(
      Number(target.x)
    ) ||
    !Number.isFinite(
      Number(target.y)
    ) ||
    !Number.isFinite(
      Number(target.radius)
    ) ||
    !Number.isFinite(
      Number(target.angleStart)
    ) ||
    !Number.isFinite(
      Number(target.angleEnd)
    )
  ) {
    window.alert(
      "Invalid ARC data."
    );
    return;
  }

  const normalizeAngle =
    (angle) =>
      (
        (
          angle %
          TWO_PI
        ) +
        TWO_PI
      ) %
      TWO_PI;

  const isAngleOnArc =
    (
      arc,
      angle
    ) => {
      const sweep =
        arc.angleEnd -
        arc.angleStart;

      if (
        Math.abs(sweep) >=
        TWO_PI -
          0.000001
      ) {
        return true;
      }

      if (
        sweep >= 0
      ) {
        return (
          normalizeAngle(
            angle -
            arc.angleStart
          ) <=
          Math.abs(sweep) +
            0.000001
        );
      }

      return (
        normalizeAngle(
          arc.angleStart -
          angle
        ) <=
        Math.abs(sweep) +
          0.000001
      );
    };

  const boundaryX =
    Number(boundary.x);

  const boundaryY =
    Number(boundary.y);

  const targetX =
    Number(target.x);

  const targetY =
    Number(target.y);

  const r1 =
    Math.abs(
      Number(boundary.radius)
    );

  const r2 =
    Math.abs(
      Number(target.radius)
    );

  if (
    r1 <= 0 ||
    r2 <= 0
  ) {
    window.alert(
      "ARC radius must be greater than zero."
    );
    return;
  }

  /* =========================
     CENTER DISTANCE
  ========================= */

  const dx =
    targetX -
    boundaryX;

  const dy =
    targetY -
    boundaryY;

  const centerDistance =
    Math.hypot(
      dx,
      dy
    );

  /* =========================
     SAME CENTER
  ========================= */

  if (
    centerDistance <
    0.000001
  ) {
    window.alert(
      "These arcs have the same center."
    );
    return;
  }

  /* =========================
     NO CIRCLE INTERSECTION
  ========================= */

  if (
    centerDistance >
      r1 + r2 +
        0.000001 ||
    centerDistance <
      Math.abs(
        r1 - r2
      ) -
        0.000001
  ) {
    window.alert(
      "The two arcs do not intersect."
    );
    return;
  }

  /* =========================
     CIRCLE-CIRCLE INTERSECTION
  ========================= */

  const a =
    (
      r1 * r1 -
      r2 * r2 +
      centerDistance *
        centerDistance
    ) /
    (
      2 *
      centerDistance
    );

  const hSquared =
    r1 * r1 -
    a * a;

  if (
    hSquared <
    -0.000001
  ) {
    window.alert(
      "The two arcs do not intersect."
    );
    return;
  }

  const h =
    Math.sqrt(
      Math.max(
        0,
        hSquared
      )
    );

  const baseX =
    boundaryX +
    (
      a * dx
    ) /
    centerDistance;

  const baseY =
    boundaryY +
    (
      a * dy
    ) /
    centerDistance;

  const offsetX =
    -dy *
    (
      h /
      centerDistance
    );

  const offsetY =
    dx *
    (
      h /
      centerDistance
    );

  const candidates = [
    {
      x:
        baseX +
        offsetX,

      y:
        baseY +
        offsetY,
    },
  ];

  /* =========================
     SECOND INTERSECTION
  ========================= */

  if (
    h >
    0.000001
  ) {
    candidates.push({
      x:
        baseX -
        offsetX,

      y:
        baseY -
        offsetY,
    });
  }

  /* =========================
     KEEP ONLY POINTS ON
     VISIBLE BOUNDARY ARC
  ========================= */

  const intersections =
    candidates
      .filter(
        (point) => {
          const boundaryAngle =
            Math.atan2(
              point.y -
                boundaryY,
              point.x -
                boundaryX
            );

          return isAngleOnArc(
            boundary,
            boundaryAngle
          );
        }
      )
      .map(
        (point) => ({
          ...point,

          targetAngle:
            Math.atan2(
              point.y -
                targetY,
              point.x -
                targetX
            ),
        })
      );

  if (
    intersections.length ===
    0
  ) {
    window.alert(
      "The visible boundary arc does not intersect the target arc."
    );
    return;
  }

  /* =========================
     FIND BEST EXTENSION POINT
  ========================= */

  const targetSweep =
    target.angleEnd -
    target.angleStart;

  let bestIntersection =
    null;

  let bestDistance =
    Infinity;

  intersections.forEach(
    (intersection) => {
      /* TARGET ALREADY REACHES
         THIS INTERSECTION */
      if (
        isAngleOnArc(
          target,
          intersection.targetAngle
        )
      ) {
        return;
      }

      let distanceFromStart;
      let distanceFromEnd;

      if (
        targetSweep >= 0
      ) {
        distanceFromStart =
          normalizeAngle(
            intersection.targetAngle -
              target.angleStart
          );

        distanceFromEnd =
          normalizeAngle(
            target.angleEnd -
              intersection.targetAngle
          );
      } else {
        distanceFromStart =
          normalizeAngle(
            target.angleStart -
              intersection.targetAngle
          );

        distanceFromEnd =
          normalizeAngle(
            intersection.targetAngle -
              target.angleEnd
          );
      }

      const distance =
        Math.min(
          distanceFromStart,
          distanceFromEnd
        );

      if (
        distance <
        bestDistance
      ) {
        bestDistance =
          distance;

        bestIntersection =
          intersection;
      }
    }
  );

  if (
    !bestIntersection
  ) {
    window.alert(
      "The target arc already reaches the boundary."
    );
    return;
  }

  /* =========================
     HISTORY
  ========================= */

  const previousObjects = [
    ...objects,
  ];

  /* =========================
     DETERMINE WHICH END
     OF TARGET ARC TO EXTEND
  ========================= */

  let extendFromStart =
    false;

  if (
    targetSweep >= 0
  ) {
    const fromStart =
      normalizeAngle(
        bestIntersection.targetAngle -
          target.angleStart
      );

    const fromEnd =
      normalizeAngle(
        target.angleEnd -
          bestIntersection.targetAngle
      );

    extendFromStart =
      fromStart <
      fromEnd;
  } else {
    const fromStart =
      normalizeAngle(
        target.angleStart -
          bestIntersection.targetAngle
      );

    const fromEnd =
      normalizeAngle(
        bestIntersection.targetAngle -
          target.angleEnd
      );

    extendFromStart =
      fromStart <
      fromEnd;
  }

  /* =========================
     UPDATE TARGET ARC
  ========================= */

  let updatedTarget;

  if (
    extendFromStart
  ) {
    updatedTarget = {
      ...target,

      angleStart:
        bestIntersection.targetAngle,
    };
  } else {
    updatedTarget = {
      ...target,

      angleEnd:
        bestIntersection.targetAngle,
    };
  }

  /* =========================
     SAVE UPDATED OBJECT
  ========================= */

  const updatedObjects =
    objects.map(
      (object, index) =>
        index === targetIndex
          ? updatedTarget
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    targetIndex
  );

  setSelectedIndexes([
    targetIndex,
  ]);

  setExtendFirstIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

  /* =========================
     UNSUPPORTED
  ========================= */

  window.alert(
  "Extend currently supports Line-Line, Line-Arc, Arc-Line and Arc-Arc."
);
};

/* =========================
   OFFSET
========================= */

const offsetObject = (index) => {
  const indexesToOffset =
    selectedIndexes.length > 1
      ? selectedIndexes
      : index !== null
        ? [index]
        : [];

  const validIndexes =
    indexesToOffset.filter(
      (i) =>
        i >= 0 &&
        i < objects.length &&
        objects[i] &&
        (
          objects[i].type === "line" ||
          objects[i].type === "rectangle" ||
          objects[i].type === "circle" ||
          objects[i].type === "arc" ||
          objects[i].type === "hatch"
        )
    );

  if (
    validIndexes.length === 0
  ) {
    window.alert(
      "Offset is currently available for Line, Rectangle, Circle, Arc and Hatch."
    );
    return;
  }

  /* =========================
     FILTER EDITABLE OBJECTS
  ========================= */

  const editableIndexes =
    validIndexes.filter(
      (i) => {
        const object =
          objects[i];

        if (
          !object ||
          object.locked
        ) {
          return false;
        }

        const layerId =
          object.layerId ||
          "layer-0";

        if (
          isLayerLocked(
            layerId
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  /* =========================
     OFFSET DISTANCE
  ========================= */

  const input =
    window.prompt(
      "Enter offset distance:",
      "50"
    );

  if (
    input === null
  ) {
    return;
  }

  const distance =
    Number(
      input.trim()
    );

  if (
    !Number.isFinite(
      distance
    ) ||
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

  const offsetObjects = [];

  /* =========================
     CREATE OFFSET OBJECTS
  ========================= */

  editableIndexes.forEach(
    (objectIndex) => {
      const original =
        objects[objectIndex];

      if (
        !original
      ) {
        return;
      }

      let newObject =
        null;

      /* =========================
         LINE OFFSET
      ========================= */

      if (
        original.type ===
        "line"
      ) {
        if (
          !Array.isArray(
            original.points
          ) ||
          original.points.length <
            4
        ) {
          return;
        }

        const x1 =
          Number(
            original.points[0]
          );

        const y1 =
          Number(
            original.points[1]
          );

        const x2 =
          Number(
            original.points[2]
          );

        const y2 =
          Number(
            original.points[3]
          );

        if (
          !Number.isFinite(x1) ||
          !Number.isFinite(y1) ||
          !Number.isFinite(x2) ||
          !Number.isFinite(y2)
        ) {
          return;
        }

        const dx =
          x2 - x1;

        const dy =
          y2 - y1;

        const length =
          Math.hypot(
            dx,
            dy
          );

        if (
          length <
          0.000001
        ) {
          return;
        }

        const nx =
          -dy /
          length;

        const ny =
          dx /
          length;

        newObject = {
          ...original,

          locked: false,
          hidden: false,

          points: [
            x1 +
              nx *
              distance,

            y1 +
              ny *
              distance,

            x2 +
              nx *
              distance,

            y2 +
              ny *
              distance,
          ],
        };
      }

      /* =========================
         RECTANGLE OFFSET
      ========================= */

      else if (
        original.type ===
        "rectangle"
      ) {
        const x =
          Number(
            original.x
          );

        const y =
          Number(
            original.y
          );

        const width =
          Number(
            original.width
          );

        const height =
          Number(
            original.height
          );

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height)
        ) {
          return;
        }

        newObject = {
          ...original,

          locked: false,
          hidden: false,

          x:
            x -
            distance,

          y:
            y -
            distance,

          width:
            Math.abs(
              width
            ) +
            distance * 2,

          height:
            Math.abs(
              height
            ) +
            distance * 2,
        };
      }

      /* =========================
         CIRCLE OFFSET
      ========================= */

      else if (
        original.type ===
        "circle"
      ) {
        const radius =
          Number(
            original.radius
          );

        if (
          !Number.isFinite(
            radius
          ) ||
          radius <= 0
        ) {
          return;
        }

        newObject = {
          ...original,

          locked: false,
          hidden: false,

          radius:
            radius +
            distance,
        };
      }

      /* =========================
         ARC OFFSET
      ========================= */

      else if (
        original.type ===
        "arc"
      ) {
        const radius =
          Number(
            original.radius
          );

        if (
          !Number.isFinite(
            radius
          ) ||
          radius <= 0
        ) {
          return;
        }

        newObject = {
          ...original,

          locked: false,
          hidden: false,

          radius:
            radius +
            distance,
        };
      }

      /* =========================
         HATCH OFFSET
      ========================= */

      else if (
        original.type ===
        "hatch"
      ) {
        const x =
          Number(
            original.x
          );

        const y =
          Number(
            original.y
          );

        const width =
          Number(
            original.width
          );

        const height =
          Number(
            original.height
          );

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height)
        ) {
          return;
        }

        newObject = {
          ...original,

          locked: false,
          hidden: false,

          x:
            x -
            distance,

          y:
            y -
            distance,

          width:
            Math.abs(
              width
            ) +
            distance * 2,

          height:
            Math.abs(
              height
            ) +
            distance * 2,
        };
      }

      /* =========================
         ADD OFFSET OBJECT
      ========================= */

      if (
        newObject
      ) {
        offsetObjects.push(
          newObject
        );
      }
    }
  );

  if (
    offsetObjects.length === 0
  ) {
    window.alert(
      "No supported objects could be offset."
    );
    return;
  }

  /* =========================
     ADD TO OBJECT LIST
  ========================= */

  const newObjects = [
    ...objects,
    ...offsetObjects,
  ];

  setObjects(
    newObjects
  );

  /* =========================
     SELECT NEW OFFSET OBJECTS
  ========================= */

  const newIndexes =
    offsetObjects.map(
      (_, offsetIndex) =>
        objects.length +
        offsetIndex
    );

  setSelectedIndexes(
    newIndexes
  );

  setSelectedIndex(
    newIndexes.length > 0
      ? newIndexes[
          newIndexes.length - 1
        ]
      : null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
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

  /* =========================
   FILLET SELECTION VALIDATION
========================= */

if (
  firstIndex === null ||
  secondIndex === null ||
  firstIndex === secondIndex
) {
  window.alert(
    "Select two different objects for Fillet."
  );
  return;
}

const firstObject =
  objects[firstIndex];

const secondObject =
  objects[secondIndex];

if (
  !firstObject ||
  !secondObject
) {
  window.alert(
    "Selected objects were not found."
  );
  return;
}

/* =========================
   OBJECT LOCK CHECK
========================= */

if (
  firstObject.locked ||
  secondObject.locked
) {
  window.alert(
    "One or both selected objects are locked."
  );
  return;
}

/* =========================
   LAYER LOCK CHECK
========================= */

const firstLayerId =
  firstObject.layerId ||
  "layer-0";

const secondLayerId =
  secondObject.layerId ||
  "layer-0";

if (
  isLayerLocked(
    firstLayerId
  ) ||
  isLayerLocked(
    secondLayerId
  )
) {
  window.alert(
    "One or both selected objects are on locked layers."
  );
  return;
}

   /* =========================
   HATCH + HATCH FILLET
========================= */

if (
  objects[firstIndex]?.type === "hatch" &&
  objects[secondIndex]?.type === "hatch"
) {
  const first = objects[firstIndex];
  const second = objects[secondIndex];

  if (
    first.locked ||
    second.locked
  ) {
    window.alert(
      "One or both selected HATCH objects are locked."
    );
    return;
  }

  const radiusInput =
    window.prompt(
      "Enter fillet radius:",
      "25"
    );

  if (radiusInput === null) {
    return;
  }

  const radius =
    Number(radiusInput);

  if (
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    window.alert(
      "Please enter a valid positive fillet radius."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const firstRight =
    first.x +
    first.width;

  const firstBottom =
    first.y +
    first.height;

  const secondRight =
    second.x +
    second.width;

  const secondBottom =
    second.y +
    second.height;

  const minX =
    Math.min(
      first.x,
      second.x
    );

  const minY =
    Math.min(
      first.y,
      second.y
    );

  const maxX =
    Math.max(
      firstRight,
      secondRight
    );

  const maxY =
    Math.max(
      firstBottom,
      secondBottom
    );

  const mergedHatch = {
    ...first,

    x: minX,
    y: minY,

    width:
      maxX - minX,

    height:
      maxY - minY,

    hatchSpacing:
      first.hatchSpacing ||
      second.hatchSpacing ||
      12,

    hatchAngle:
      first.hatchAngle ??
      second.hatchAngle ??
      45,

    hatchColor:
      first.hatchColor ||
      second.hatchColor ||
      "#00aaff",

    filletRadius:
      radius,

    trimEnabled: false,
    trimStartPoint: null,
    trimEndPoint: null,
    trimPoint: null,

    locked: false,
    hidden: false,
  };

  const newObjects =
    objects.filter(
      (_, index) =>
        index !== firstIndex &&
        index !== secondIndex
    );

  newObjects.push(
    mergedHatch
  );

  setObjects(
    newObjects
  );

  const newIndex =
    newObjects.length - 1;

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

  const selectedLineIndexes =
    selectedIndexes.filter(
      (i) =>
        objects[i] &&
        objects[i].type === "line"
    );

  if (
    selectedLineIndexes.length === 2
  ) {
    firstIndex =
      selectedLineIndexes[0];

    secondIndex =
      selectedLineIndexes[1];
  }

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

    setSelectedIndexes([
  newObjects.length - 1
]);

    saveHistory(
      previousObjects,
      [...measurements]
    );
  };
  const chamferObject = (
  firstIndex,
  secondIndex
) => {

    /* =========================
     LINE + LINE CHAMFER
  ========================= */

  if (
    objects[firstIndex]?.type === "line" &&
    objects[secondIndex]?.type === "line"
  ) {
    const first = objects[firstIndex];
    const second = objects[secondIndex];

    const distanceInput = window.prompt(
      "Enter chamfer distance:",
      "25"
    );

    if (distanceInput === null) {
      return;
    }

    const distance = Number(distanceInput);

    if (
      !Number.isFinite(distance) ||
      distance <= 0
    ) {
      window.alert(
        "Please enter a valid positive chamfer distance."
      );
      return;
    }

    const [x1, y1, x2, y2] =
      first.points;

    const [x3, y3, x4, y4] =
      second.points;

    const cross =
      (x2 - x1) * (y4 - y3) -
      (y2 - y1) * (x4 - x3);

    if (Math.abs(cross) < 0.000001) {
      window.alert(
        "Chamfer requires two intersecting non-parallel lines."
      );
      return;
    }

    const t =
      (
        (x3 - x1) * (y4 - y3) -
        (y3 - y1) * (x4 - x3)
      ) / cross;

    const u =
      (
        (x3 - x1) * (y2 - y1) -
        (y3 - y1) * (x2 - x1)
      ) / cross;

    const ix =
      x1 + t * (x2 - x1);

    const iy =
      y1 + t * (y2 - y1);

    const firstLength =
      Math.hypot(
        x2 - x1,
        y2 - y1
      );

    const secondLength =
      Math.hypot(
        x4 - x3,
        y4 - y3
      );

    if (
      distance * 2 >= firstLength ||
      distance * 2 >= secondLength
    ) {
      window.alert(
        "Chamfer distance is too large."
      );
      return;
    }

    const firstDir =
      normalizeVector(
        x2 - x1,
        y2 - y1
      );

    const secondDir =
      normalizeVector(
        x4 - x3,
        y4 - y3
      );

    const firstEndCandidates = [
      {
        x: x1,
        y: y1,
        d: distanceBetween(
          x1,
          y1,
          ix,
          iy
        ),
      },
      {
        x: x2,
        y: y2,
        d: distanceBetween(
          x2,
          y2,
          ix,
          iy
        ),
      },
    ];

    const secondEndCandidates = [
      {
        x: x3,
        y: y3,
        d: distanceBetween(
          x3,
          y3,
          ix,
          iy
        ),
      },
      {
        x: x4,
        y: y4,
        d: distanceBetween(
          x4,
          y4,
          ix,
          iy
        ),
      },
    ];

    const firstNearest =
      firstEndCandidates.sort(
        (a, b) => a.d - b.d
      )[0];

    const secondNearest =
      secondEndCandidates.sort(
        (a, b) => a.d - b.d
      )[0];

    const firstSign =
      (
        (firstNearest.x - ix) *
          firstDir.x +
        (firstNearest.y - iy) *
          firstDir.y
      ) >= 0
        ? 1
        : -1;

    const secondSign =
      (
        (secondNearest.x - ix) *
          secondDir.x +
        (secondNearest.y - iy) *
          secondDir.y
      ) >= 0
        ? 1
        : -1;

    const firstChamferPoint = {
      x:
        ix +
        firstDir.x *
          distance *
          firstSign,

      y:
        iy +
        firstDir.y *
          distance *
          firstSign,
    };

    const secondChamferPoint = {
      x:
        ix +
        secondDir.x *
          distance *
          secondSign,

      y:
        iy +
        secondDir.y *
          distance *
          secondSign,
    };

    const updateLine = (
      object,
      chamferPoint,
      intersection
    ) => {
      const [
        ox1,
        oy1,
        ox2,
        oy2,
      ] = object.points;

      const d1 =
        distanceBetween(
          ox1,
          oy1,
          intersection.x,
          intersection.y
        );

      const d2 =
        distanceBetween(
          ox2,
          oy2,
          intersection.x,
          intersection.y
        );

      if (d1 < d2) {
        return {
          ...object,
          points: [
            chamferPoint.x,
            chamferPoint.y,
            ox2,
            oy2,
          ],
        };
      }

      return {
        ...object,
        points: [
          ox1,
          oy1,
          chamferPoint.x,
          chamferPoint.y,
        ],
      };
    };

    const previousObjects = [
      ...objects,
    ];

    const updatedObjects = [
      ...objects,
    ];

    updatedObjects[firstIndex] =
      updateLine(
        first,
        firstChamferPoint,
        {
          x: ix,
          y: iy,
        }
      );

    updatedObjects[secondIndex] =
      updateLine(
        second,
        secondChamferPoint,
        {
          x: ix,
          y: iy,
        }
      );

    updatedObjects.push({
      type: "line",

      points: [
        firstChamferPoint.x,
        firstChamferPoint.y,
        secondChamferPoint.x,
        secondChamferPoint.y,
      ],

      color:
        first.color ||
        "#ffffff",

      strokeWidth:
        first.strokeWidth ||
        2,

      layerId:
        first.layerId ||
        activeLayerId,

      locked: false,
      hidden: false,
    });

    setObjects(
      updatedObjects
    );

    const newIndex =
      updatedObjects.length - 1;

    setSelectedIndex(
      newIndex
    );

    setSelectedIndexes([
      newIndex,
    ]);

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  /* =========================
   HATCH + HATCH CHAMFER
========================= */

if (
  objects[firstIndex]?.type === "hatch" &&
  objects[secondIndex]?.type === "hatch"
) {
  const first = objects[firstIndex];
  const second = objects[secondIndex];

  if (
    first.locked ||
    second.locked
  ) {
    window.alert(
      "One or both selected HATCH objects are locked."
    );
    return;
  }

  const distanceInput =
    window.prompt(
      "Enter chamfer distance:",
      "25"
    );

  if (distanceInput === null) {
    return;
  }

  const distance =
    Number(distanceInput);

  if (
    !Number.isFinite(distance) ||
    distance <= 0
  ) {
    window.alert(
      "Please enter a valid positive chamfer distance."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const firstX =
    Number(first.x) || 0;

  const firstY =
    Number(first.y) || 0;

  const firstW =
    Math.abs(Number(first.width) || 0);

  const firstH =
    Math.abs(Number(first.height) || 0);

  const secondX =
    Number(second.x) || 0;

  const secondY =
    Number(second.y) || 0;

  const secondW =
    Math.abs(Number(second.width) || 0);

  const secondH =
    Math.abs(Number(second.height) || 0);

  const overlapLeft =
    Math.max(
      firstX,
      secondX
    );

  const overlapTop =
    Math.max(
      firstY,
      secondY
    );

  const overlapRight =
    Math.min(
      firstX + firstW,
      secondX + secondW
    );

  const overlapBottom =
    Math.min(
      firstY + firstH,
      secondY + secondH
    );

  if (
    overlapLeft >= overlapRight ||
    overlapTop >= overlapBottom
  ) {
    window.alert(
      "The HATCH objects do not intersect."
    );
    return;
  }

  const newX =
    Math.min(
      firstX,
      secondX
    );

  const newY =
    Math.min(
      firstY,
      secondY
    );

  const newRight =
    Math.max(
      firstX + firstW,
      secondX + secondW
    );

  const newBottom =
    Math.max(
      firstY + firstH,
      secondY + secondH
    );

  const mergedHatch = {
    ...first,

    x: newX,
    y: newY,

    width:
      newRight - newX,

    height:
      newBottom - newY,

    chamferDistance:
      distance,

    hatchSpacing:
      first.hatchSpacing ||
      second.hatchSpacing ||
      12,

    hatchAngle:
      first.hatchAngle ??
      second.hatchAngle ??
      45,

    hatchColor:
      first.hatchColor ||
      second.hatchColor ||
      "#00aaff",

    trimEnabled: false,
    trimStartPoint: null,
    trimEndPoint: null,
    trimPoint: null,

    locked: false,
    hidden: false,
  };

  const newObjects =
    objects.filter(
      (_, index) =>
        index !== firstIndex &&
        index !== secondIndex
    );

  newObjects.push(
    mergedHatch
  );

  setObjects(
    newObjects
  );

  const newIndex =
    newObjects.length - 1;

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}


  const selectedLineIndexes =
    selectedIndexes.filter(
      (i) =>
        objects[i] &&
        objects[i].type === "line"
    );

  if (
    selectedLineIndexes.length === 2
  ) {
    firstIndex =
      selectedLineIndexes[0];

    secondIndex =
      selectedLineIndexes[1];
  }

  const first =
    objects[firstIndex];

  const second =
    objects[secondIndex];

  if (!first || !second) {
    return;
  }

  if (
    first.type !== "line" ||
    second.type !== "line"
  ) {
    window.alert(
      "Chamfer currently works only with two lines."
    );
    return;
  }

  if (
    first.locked ||
    second.locked
  ) {
    window.alert(
      "One or both selected lines are locked."
    );
    return;
  }

  const input =
    window.prompt(
      "Enter chamfer distance:",
      "25"
    );

  if (input === null) {
    return;
  }

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

      const d =
        Math.sqrt(
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

    locked: false,
    hidden: false,
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

  setObjects(
    newObjects
  );

  const newIndex =
    newObjects.length - 1;

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );
};

 /* =========================
   ARRAY
========================= */

const arrayObject = (index) => {
  const indexesToArray =
    selectedIndexes.length > 1
      ? selectedIndexes
      : index !== null
        ? [index]
        : [];

  const validIndexes =
    indexesToArray.filter(
      (i) =>
        i >= 0 &&
        i < objects.length &&
        objects[i] &&
        !objects[i].hidden
    );

  if (
    validIndexes.length === 0
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  /* =========================
   POLAR ARRAY
========================= */

const polarArrayObject = (index) => {
  const indexesToArray =
    selectedIndexes.length > 1
      ? selectedIndexes
      : index !== null
        ? [index]
        : [];

  const validIndexes =
    indexesToArray.filter(
      (i) =>
        i >= 0 &&
        i < objects.length &&
        objects[i] &&
        !objects[i].hidden
    );

  if (validIndexes.length === 0) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    validIndexes.filter(
      (i) => {
        const object =
          objects[i];

        if (
          !object ||
          object.locked
        ) {
          return false;
        }

        const layerId =
          object.layerId ||
          "layer-0";

        if (
          isLayerLocked(
            layerId
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const countInput =
    window.prompt(
      "Number of items:",
      "6"
    );

  if (
    countInput === null
  ) {
    return;
  }

  const angleInput =
    window.prompt(
      "Total angle:",
      "360"
    );

  if (
    angleInput === null
  ) {
    return;
  }

  const centerXInput =
    window.prompt(
      "Center X:",
      "0"
    );

  if (
    centerXInput === null
  ) {
    return;
  }

  const centerYInput =
    window.prompt(
      "Center Y:",
      "0"
    );

  if (
    centerYInput === null
  ) {
    return;
  }

  const count =
    Number(countInput);

  const totalAngle =
    Number(angleInput);

  const centerX =
    Number(centerXInput);

  const centerY =
    Number(centerYInput);

  if (
    !Number.isInteger(count) ||
    count < 2
  ) {
    window.alert(
      "Number of items must be an integer greater than 1."
    );
    return;
  }

  if (
    !Number.isFinite(totalAngle) ||
    totalAngle === 0
  ) {
    window.alert(
      "Please enter a valid angle."
    );
    return;
  }

  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY)
  ) {
    window.alert(
      "Please enter valid center coordinates."
    );
    return;
  }

  if (
    count *
      editableIndexes.length >
    1000
  ) {
    window.alert(
      "Array is too large. Maximum 1000 objects."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const newObjects = [
    ...objects,
  ];

  const angleStep =
    totalAngle /
    count;

  const rotatePoint = (
    x,
    y,
    angle
  ) => {
    const radians =
      angle *
      Math.PI /
      180;

    const cos =
      Math.cos(radians);

    const sin =
      Math.sin(radians);

    const dx =
      x - centerX;

    const dy =
      y - centerY;

    return {
      x:
        centerX +
        dx * cos -
        dy * sin,

      y:
        centerY +
        dx * sin +
        dy * cos,
    };
  };

  const rotateObject =
    (
      object,
      angle
    ) => {
      const copy = {
        ...object,
      };

      if (
        object.type ===
          "line" &&
        Array.isArray(
          object.points
        )
      ) {
        const p1 =
          rotatePoint(
            object.points[0],
            object.points[1],
            angle
          );

        const p2 =
          rotatePoint(
            object.points[2],
            object.points[3],
            angle
          );

        copy.points = [
          p1.x,
          p1.y,
          p2.x,
          p2.y,
        ];
      }

      else if (
        object.type ===
          "rectangle"
      ) {
        const points = [
          rotatePoint(
            object.x,
            object.y,
            angle
          ),
          rotatePoint(
            object.x +
              object.width,
            object.y,
            angle
          ),
          rotatePoint(
            object.x +
              object.width,
            object.y +
              object.height,
            angle
          ),
          rotatePoint(
            object.x,
            object.y +
              object.height,
            angle
          ),
        ];

        copy.type =
          "polyline";

        copy.points =
          points.flatMap(
            (p) => [
              p.x,
              p.y,
            ]
          );

        copy.closed =
          true;

        delete copy.x;
        delete copy.y;
        delete copy.width;
        delete copy.height;
      }

      else if (
        object.type ===
          "circle"
      ) {
        const center =
          rotatePoint(
            object.x,
            object.y,
            angle
          );

        copy.x =
          center.x;

        copy.y =
          center.y;
      }

      else if (
  object.type ===
  "ellipse"
) {
  const center =
    rotatePoint(
      object.x,
      object.y,
      angle
    );

  copy.x =
    center.x;

  copy.y =
    center.y;

  copy.rotation =
    (object.rotation || 0) +
    angle * (180 / Math.PI);
}

      else if (
        object.type ===
          "arc"
      ) {
        const center =
          rotatePoint(
            object.x,
            object.y,
            angle
          );

        copy.x =
          center.x;

        copy.y =
          center.y;

        copy.startAngle =
          (object.startAngle || 0) +
          angle;

        copy.endAngle =
          (object.endAngle || 0) +
          angle;
      }

      else if (
        object.type ===
          "text"
      ) {
        const point =
          rotatePoint(
            object.x,
            object.y,
            angle
          );

        copy.x =
          point.x;

        copy.y =
          point.y;

        copy.rotation =
          (object.rotation || 0) +
          angle;
      }

      else if (
        object.type ===
          "polyline" ||
        object.type ===
          "hatch"
      ) {
        if (
          Array.isArray(
            object.points
          )
        ) {
          const rotatedPoints =
            [];

          for (
            let i = 0;
            i <
              object.points.length;
            i += 2
          ) {
            const point =
              rotatePoint(
                object.points[i],
                object.points[i + 1],
                angle
              );

            rotatedPoints.push(
              point.x,
              point.y
            );
          }

          copy.points =
            rotatedPoints;
        }
      }

      return copy;
    };

  for (
    let step = 1;
    step < count;
    step++
  ) {
    const angle =
      angleStep * step;

    editableIndexes.forEach(
      (sourceIndex) => {
        const source =
          objects[
            sourceIndex
          ];

        if (!source) {
          return;
        }

        const duplicate =
          rotateObject(
            source,
            angle
          );

        newObjects.push(
          {
            ...duplicate,

            locked: false,

            hidden: false,

            layerId:
              source.layerId ||
              activeLayerId,
          }
        );
      }
    );
  }

  setObjects(
    newObjects
  );

  const lastIndex =
    newObjects.length - 1;

  setSelectedIndex(
    lastIndex
  );

  setSelectedIndexes([
    lastIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );
};

  /* =========================
     FILTER EDITABLE OBJECTS
  ========================= */

  const editableIndexes =
    validIndexes.filter(
      (i) => {
        const object =
          objects[i];

        if (
          !object ||
          object.locked
        ) {
          return false;
        }

        const layerId =
          object.layerId ||
          "layer-0";

        if (
          isLayerLocked(
            layerId
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const rowsInput =
    window.prompt(
      "Number of rows:",
      "2"
    );

  if (
    rowsInput === null
  ) {
    return;
  }

  const columnsInput =
    window.prompt(
      "Number of columns:",
      "3"
    );

  if (
    columnsInput === null
  ) {
    return;
  }

  const xSpacingInput =
    window.prompt(
      "X spacing:",
      "100"
    );

  if (
    xSpacingInput === null
  ) {
    return;
  }

  const ySpacingInput =
    window.prompt(
      "Y spacing:",
      "100"
    );

  if (
    ySpacingInput === null
  ) {
    return;
  }

  const rows =
    Number(
      rowsInput
    );

  const columns =
    Number(
      columnsInput
    );

  const xSpacing =
    Number(
      xSpacingInput
    );

  const ySpacing =
    Number(
      ySpacingInput
    );

  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    rows < 1 ||
    columns < 1
  ) {
    window.alert(
      "Rows and columns must be positive integers."
    );
    return;
  }

  if (
    rows * columns >
    1000
  ) {
    window.alert(
      "Array is too large. Maximum 1000 objects."
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

  editableIndexes.forEach(
    (sourceIndex) => {
      const original =
        objects[sourceIndex];

      if (
        !original
      ) {
        return;
      }

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
          /* ORIGINAL OBJECT */
          if (
            row === 0 &&
            column === 0
          ) {
            continue;
          }

          const copy = {
            ...original,

            locked: false,
            hidden: false,
          };

          const offsetX =
            column *
            xSpacing;

          const offsetY =
            row *
            ySpacing;

          /* =========================
             LINE
          ========================= */

          if (
            original.type ===
            "line"
          ) {
            if (
              !Array.isArray(
                original.points
              ) ||
              original.points.length <
                4
            ) {
              continue;
            }

            copy.points = [
              Number(
                original.points[0]
              ) + offsetX,

              Number(
                original.points[1]
              ) + offsetY,

              Number(
                original.points[2]
              ) + offsetX,

              Number(
                original.points[3]
              ) + offsetY,
            ];
          }

          /* =========================
             POLYLINE
          ========================= */

          else if (
            original.type ===
            "polyline"
          ) {
            if (
              !Array.isArray(
                original.points
              ) ||
              original.points.length <
                4
            ) {
              continue;
            }

            copy.points =
              original.points.map(
                (
                  value,
                  i
                ) => {
                  const numericValue =
                    Number(
                      value
                    );

                  if (
                    !Number.isFinite(
                      numericValue
                    )
                  ) {
                    return value;
                  }

                  return (
                    i % 2 === 0
                      ? numericValue +
                        offsetX
                      : numericValue +
                        offsetY
                  );
                }
              );
          }

          /* =========================
             CIRCLE
          ========================= */

          else if (
            original.type ===
            "circle"
          ) {
            const x =
              Number(
                original.x
              );

            const y =
              Number(
                original.y
              );

            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y)
            ) {
              continue;
            }

            copy.x =
              x +
              offsetX;

            copy.y =
              y +
              offsetY;
          }

          /* =========================
             RECTANGLE
          ========================= */

          else if (
            original.type ===
            "rectangle"
          ) {
            const x =
              Number(
                original.x
              );

            const y =
              Number(
                original.y
              );

            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y)
            ) {
              continue;
            }

            copy.x =
              x +
              offsetX;

            copy.y =
              y +
              offsetY;
          }

          /* =========================
             ARC
          ========================= */

          else if (
            original.type ===
            "arc"
          ) {
            const x =
              Number(
                original.x
              );

            const y =
              Number(
                original.y
              );

            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y)
            ) {
              continue;
            }

            copy.x =
              x +
              offsetX;

            copy.y =
              y +
              offsetY;
          }

          /* =========================
             HATCH
          ========================= */

          else if (
            original.type ===
            "hatch"
          ) {
            const x =
              Number(
                original.x
              );

            const y =
              Number(
                original.y
              );

            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y)
            ) {
              continue;
            }

            copy.x =
              x +
              offsetX;

            copy.y =
              y +
              offsetY;
          }

          /* =========================
             TEXT
          ========================= */

          else if (
            original.type ===
            "text"
          ) {
            const x =
              Number(
                original.x
              );

            const y =
              Number(
                original.y
              );

            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y)
            ) {
              continue;
            }

            copy.x =
              x +
              offsetX;

            copy.y =
              y +
              offsetY;
          }

          else {
            continue;
          }

          copies.push(
            copy
          );
        }
      }
    }
  );

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

  setObjects(
    newObjects
  );

  const newIndexes =
    copies.map(
      (
        _,
        copyIndex
      ) =>
        objects.length +
        copyIndex
    );

  setSelectedIndexes(
    newIndexes
  );

  setSelectedIndex(
    newIndexes.length > 0
      ? newIndexes[
          newIndexes.length - 1
        ]
      : null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};

/* =========================
   SCALE
========================= */

const scaleObject = (index) => {
  const indexesToScale =
    selectedIndexes.length > 1
      ? selectedIndexes
      : index !== null
        ? [index]
        : [];

  const validIndexes =
    indexesToScale.filter(
      (i) =>
        i >= 0 &&
        i < objects.length &&
        objects[i] &&
        !objects[i].hidden
    );

  if (
    validIndexes.length === 0
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    validIndexes.filter(
      (i) => {
        const object =
          objects[i];

        if (
          !object ||
          object.locked
        ) {
          return false;
        }

        const layerId =
          object.layerId ||
          "layer-0";

        return !isLayerLocked(
          layerId
        );
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const factorInput =
    window.prompt(
      "Enter scale factor:",
      "2"
    );

  if (
    factorInput === null
  ) {
    return;
  }

  const factor =
    Number(
      factorInput.trim()
    );

  if (
    !Number.isFinite(factor) ||
    factor <= 0
  ) {
    window.alert(
      "Please enter a valid positive scale factor."
    );
    return;
  }

  if (
    factor > 1000
  ) {
    window.alert(
      "Scale factor is too large. Maximum is 1000."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const copies = [];

  editableIndexes.forEach(
    (objectIndex) => {
      const original =
        objects[objectIndex];

      if (
        !original
      ) {
        return;
      }

      const copy = {
        ...original,

        locked: false,
        hidden: false,
      };

      /* =========================
         LINE
      ========================= */

      if (
        original.type ===
        "line"
      ) {
        if (
          !Array.isArray(
            original.points
          ) ||
          original.points.length <
            4
        ) {
          return;
        }

        copy.points =
          original.points.map(
            (value) => {
              const numericValue =
                Number(value);

              return Number.isFinite(
                numericValue
              )
                ? numericValue *
                    factor
                : value;
            }
          );
      }

      /* =========================
         POLYLINE
      ========================= */

      else if (
        original.type ===
        "polyline"
      ) {
        if (
          !Array.isArray(
            original.points
          ) ||
          original.points.length <
            4
        ) {
          return;
        }

        copy.points =
          original.points.map(
            (value) => {
              const numericValue =
                Number(value);

              return Number.isFinite(
                numericValue
              )
                ? numericValue *
                    factor
                : value;
            }
          );
      }

      /* =========================
         CIRCLE
      ========================= */

      else if (
        original.type ===
        "circle"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        const radius =
          Number(
            original.radius
          );

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(radius) ||
          radius <= 0
        ) {
          return;
        }

        copy.x =
          x * factor;

        copy.y =
          y * factor;

        copy.radius =
          radius * factor;
      }

      /* =========================
         RECTANGLE
      ========================= */

      else if (
        original.type ===
        "rectangle"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        const width =
          Number(
            original.width
          );

        const height =
          Number(
            original.height
          );

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height)
        ) {
          return;
        }

        copy.x =
          x * factor;

        copy.y =
          y * factor;

        copy.width =
          width * factor;

        copy.height =
          height * factor;
      }

      /* =========================
         ARC
      ========================= */

      else if (
        original.type ===
        "arc"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        const radius =
          Number(
            original.radius
          );

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(radius) ||
          radius <= 0
        ) {
          return;
        }

        copy.x =
          x * factor;

        copy.y =
          y * factor;

        copy.radius =
          radius * factor;
      }

      /* =========================
         HATCH
      ========================= */

      else if (
        original.type ===
        "hatch"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        const width =
          Number(
            original.width
          );

        const height =
          Number(
            original.height
          );

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height)
        ) {
          return;
        }

        copy.x =
          x * factor;

        copy.y =
          y * factor;

        copy.width =
          width * factor;

        copy.height =
          height * factor;

        const hatchSpacing =
          Number(
            original.hatchSpacing
          );

        copy.hatchSpacing =
          (
            Number.isFinite(
              hatchSpacing
            )
              ? hatchSpacing
              : 12
          ) * factor;

        if (
          original.trimStartPoint
        ) {
          copy.trimStartPoint = {
            x:
              Number(
                original
                  .trimStartPoint
                  .x
              ) * factor,

            y:
              Number(
                original
                  .trimStartPoint
                  .y
              ) * factor,
          };
        }

        if (
          original.trimEndPoint
        ) {
          copy.trimEndPoint = {
            x:
              Number(
                original
                  .trimEndPoint
                  .x
              ) * factor,

            y:
              Number(
                original
                  .trimEndPoint
                  .y
              ) * factor,
          };
        }

        if (
          original.trimPoint
        ) {
          copy.trimPoint = {
            x:
              Number(
                original
                  .trimPoint
                  .x
              ) * factor,

            y:
              Number(
                original
                  .trimPoint
                  .y
              ) * factor,
          };
        }
      }

      /* =========================
         TEXT
      ========================= */

      else if (
        original.type ===
        "text"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        const fontSize =
          Number(
            original.fontSize ||
              24
          );

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(fontSize)
        ) {
          return;
        }

        copy.x =
          x * factor;

        copy.y =
          y * factor;

        copy.fontSize =
          fontSize * factor;
      }

      else {
        return;
      }

      copies.push(copy);
    }
  );

  if (
    copies.length === 0
  ) {
    window.alert(
      "No supported objects were selected."
    );
    return;
  }

  const newObjects = [
    ...objects,
    ...copies,
  ];

  setObjects(
    newObjects
  );

  const newIndexes =
    copies.map(
      (_, copyIndex) =>
        objects.length +
        copyIndex
    );

  setSelectedIndexes(
    newIndexes
  );

  setSelectedIndex(
    newIndexes.length > 0
      ? newIndexes[
          newIndexes.length - 1
        ]
      : null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};


/* =========================
   MIRROR
========================= */

const mirrorObject = (index) => {
  const indexesToMirror =
    selectedIndexes.length > 0
      ? selectedIndexes
      : index !== null &&
        index !== undefined
        ? [index]
        : [];

  const validIndexes =
    indexesToMirror.filter(
      (objectIndex) =>
        objectIndex >= 0 &&
        objectIndex < objects.length &&
        objects[objectIndex] &&
        !objects[objectIndex].hidden
    );

  if (
    validIndexes.length === 0
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    validIndexes.filter(
      (objectIndex) => {
        const object =
          objects[objectIndex];

        if (
          !object ||
          object.locked
        ) {
          return false;
        }

        const layerId =
          object.layerId ||
          "layer-0";

        return !isLayerLocked(
          layerId
        );
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const axisInput =
    window.prompt(
      "Mirror axis: H = Horizontal, V = Vertical",
      "V"
    );

  if (
    axisInput === null
  ) {
    return;
  }

  const axis =
    axisInput
      .trim()
      .toUpperCase();

  if (
    axis !== "H" &&
    axis !== "V"
  ) {
    window.alert(
      "Please enter H or V."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const copies = [];

  editableIndexes.forEach(
    (objectIndex) => {
      const original =
        objects[objectIndex];

      if (
        !original
      ) {
        return;
      }

      const copy = {
        ...original,

        locked: false,
        hidden: false,
      };

      /* =========================
         LINE
      ========================= */

      if (
        original.type ===
        "line"
      ) {
        if (
          !Array.isArray(
            original.points
          ) ||
          original.points.length <
            4
        ) {
          return;
        }

        copy.points =
          original.points.map(
            (value, pointIndex) => {
              const numericValue =
                Number(value);

              if (
                !Number.isFinite(
                  numericValue
                )
              ) {
                return value;
              }

              if (
                pointIndex % 2 === 0
              ) {
                return axis === "V"
                  ? -numericValue
                  : numericValue;
              }

              return axis === "H"
                ? -numericValue
                : numericValue;
            }
          );
      }

      /* =========================
         POLYLINE
      ========================= */

      else if (
        original.type ===
        "polyline"
      ) {
        if (
          !Array.isArray(
            original.points
          ) ||
          original.points.length <
            4
        ) {
          return;
        }

        copy.points =
          original.points.map(
            (value, pointIndex) => {
              const numericValue =
                Number(value);

              if (
                !Number.isFinite(
                  numericValue
                )
              ) {
                return value;
              }

              if (
                pointIndex % 2 === 0
              ) {
                return axis === "V"
                  ? -numericValue
                  : numericValue;
              }

              return axis === "H"
                ? -numericValue
                : numericValue;
            }
          );
      }

      /* =========================
         CIRCLE
      ========================= */

      else if (
        original.type ===
        "circle"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y)
        ) {
          return;
        }

        copy.x =
          axis === "V"
            ? -x
            : x;

        copy.y =
          axis === "H"
            ? -y
            : y;
      }

      /* =========================
   ELLIPSE
========================= */

else if (
  original.type ===
  "ellipse"
) {
  const x =
    Number(original.x);

  const y =
    Number(original.y);

  const radiusX =
    Number(original.radiusX);

  const radiusY =
    Number(original.radiusY);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(radiusX) ||
    !Number.isFinite(radiusY)
  ) {
    return;
  }

  copy.x =
    axis === "V"
      ? -x
      : x;

  copy.y =
    axis === "H"
      ? -y
      : y;

  copy.radiusX =
    radiusX;

  copy.radiusY =
    radiusY;

  copy.rotation =
    -(
      Number(
        original.rotation || 0
      )
    );
}

      /* =========================
         RECTANGLE
      ========================= */

      else if (
        original.type ===
        "rectangle"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        const width =
          Number(original.width);

        const height =
          Number(original.height);

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height)
        ) {
          return;
        }

        copy.x =
          axis === "V"
            ? -x - width
            : x;

        copy.y =
          axis === "H"
            ? -y - height
            : y;

        copy.width =
          width;

        copy.height =
          height;
      }

      /* =========================
         HATCH
      ========================= */

      else if (
        original.type ===
        "hatch"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        const width =
          Number(original.width);

        const height =
          Number(original.height);

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height)
        ) {
          return;
        }

        copy.x =
          axis === "V"
            ? -x - width
            : x;

        copy.y =
          axis === "H"
            ? -y - height
            : y;

        copy.width =
          width;

        copy.height =
          height;

        copy.rotation =
          axis === "V"
            ? -(
                Number(
                  original.rotation ||
                    0
                )
              )
            : -(
                Number(
                  original.rotation ||
                    0
                )
              );

        if (
          original.trimStartPoint
        ) {
          copy.trimStartPoint = {
            x:
              axis === "V"
                ? -Number(
                    original
                      .trimStartPoint
                      .x
                  )
                : Number(
                    original
                      .trimStartPoint
                      .x
                  ),

            y:
              axis === "H"
                ? -Number(
                    original
                      .trimStartPoint
                      .y
                  )
                : Number(
                    original
                      .trimStartPoint
                      .y
                  ),
          };
        }

        if (
          original.trimEndPoint
        ) {
          copy.trimEndPoint = {
            x:
              axis === "V"
                ? -Number(
                    original
                      .trimEndPoint
                      .x
                  )
                : Number(
                    original
                      .trimEndPoint
                      .x
                  ),

            y:
              axis === "H"
                ? -Number(
                    original
                      .trimEndPoint
                      .y
                  )
                : Number(
                    original
                      .trimEndPoint
                      .y
                  ),
          };
        }
      }

      /* =========================
         ARC
      ========================= */

      else if (
        original.type ===
        "arc"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        const radius =
          Number(
            original.radius
          );

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(radius)
        ) {
          return;
        }

        copy.x =
          axis === "V"
            ? -x
            : x;

        copy.y =
          axis === "H"
            ? -y
            : y;

        if (
          axis === "V"
        ) {
          copy.angleStart =
            Math.PI -
            original.angleEnd;

          copy.angleEnd =
            Math.PI -
            original.angleStart;
        } else {
          copy.angleStart =
            -original.angleEnd;

          copy.angleEnd =
            -original.angleStart;
        }

        copy.rotation =
          0;
      }

      /* =========================
         TEXT
      ========================= */

      else if (
        original.type ===
        "text"
      ) {
        const x =
          Number(original.x);

        const y =
          Number(original.y);

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y)
        ) {
          return;
        }

        copy.x =
          axis === "V"
            ? -x
            : x;

        copy.y =
          axis === "H"
            ? -y
            : y;

        const rotation =
          Number(
            original.rotation ||
              0
          );

        copy.rotation =
          axis === "H"
            ? -rotation
            : 180 -
              rotation;
      }

      else {
        return;
      }

      copies.push(
        copy
      );
    }
  );

  if (
    copies.length === 0
  ) {
    window.alert(
      "No supported unlocked objects were selected."
    );
    return;
  }

  const newObjects = [
    ...objects,
    ...copies,
  ];

  setObjects(
    newObjects
  );

  const newIndexes =
    copies.map(
      (_, copyIndex) =>
        objects.length +
        copyIndex
    );

  setSelectedIndexes(
    newIndexes
  );

  setSelectedIndex(
    newIndexes.length > 0
      ? newIndexes[
          newIndexes.length - 1
        ]
      : null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};

/* =========================
   EXPLODE
========================= */

const explodeObject = (index) => {
  const indexesToExplode =
    selectedIndexes.length > 1
      ? selectedIndexes
      : index !== null
        ? [index]
        : [];

  const validIndexes =
    indexesToExplode.filter(
      (i) =>
        i >= 0 &&
        i < objects.length &&
        objects[i]
    );

  if (
    validIndexes.length === 0
  ) {
    return;
  }

  const editableIndexes =
  validIndexes.filter(
    (i) => {
      const object =
        objects[i];

      if (
        !object ||
        object.hidden ||
        object.locked
      ) {
        return false;
      }

      const layerId =
        object.layerId ||
        "layer-0";

      if (
        isLayerLocked(
          layerId
        )
      ) {
        return false;
      }

      return true;
    }
  );

 if (
  editableIndexes.length === 0
) {
  window.alert(
    "Selected object or its layer is locked."
  );
  return;
}

  const previousObjects = [
    ...objects,
  ];

  const explodeSet =
    new Set(
      editableIndexes
    );

  const newObjects = [];
  const newSelectedIndexes = [];

  objects.forEach(
    (original, objectIndex) => {
      /* NORMAL OBJECT */

      if (
        !explodeSet.has(
          objectIndex
        )
      ) {
        newObjects.push(
          original
        );
        return;
      }

      /* RECTANGLE → 4 LINES */

      if (
        original.type ===
        "rectangle"
      ) {
        const x =
          original.x;

        const y =
          original.y;

        const width =
          original.width;

        const height =
          original.height;

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
          locked: false,
          hidden: false,
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

        const startIndex =
          newObjects.length;

        newObjects.push(
          ...lines
        );

        for (
          let i = 0;
          i < lines.length;
          i++
        ) {
          newSelectedIndexes.push(
            startIndex + i
          );
        }

        return;
      }

            /* HATCH → 4 BOUNDARY LINES */

      if (
        original.type ===
        "hatch"
      ) {
        const x =
          original.x || 0;

        const y =
          original.y || 0;

        const width =
          original.width || 0;

        const height =
          original.height || 0;

        const common = {
          rotation: 0,
          color:
            original.color ||
            "#ffffff",
          strokeWidth:
            original.strokeWidth ||
            1,
          layerId:
            original.layerId ||
            activeLayerId,
          locked: false,
          hidden: false,
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

        const startIndex =
          newObjects.length;

        newObjects.push(
          ...lines
        );

        for (
          let i = 0;
          i < lines.length;
          i++
        ) {
          newSelectedIndexes.push(
            startIndex + i
          );
        }

        return;
      }

      /* POLYLINE → LINES */

      if (
        original.type ===
        "polyline"
      ) {
        const points =
          original.points;

        if (
          !points ||
          points.length < 4
        ) {
          newObjects.push(
            original
          );

          return;
        }

        const lines = [];

        for (
          let i = 0;
          i <
            points.length - 2;
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
            locked: false,
            hidden: false,
          });
        }

        const startIndex =
          newObjects.length;

        newObjects.push(
          ...lines
        );

        for (
          let i = 0;
          i < lines.length;
          i++
        ) {
          newSelectedIndexes.push(
            startIndex + i
          );
        }

        return;
      }

      /* ARC → LINE SEGMENTS */

      if (
        original.type ===
        "arc"
      ) {
        const radius =
          Number(
            original.radius
          );

        const angleStart =
          Number(
            original.angleStart
          );

        const angleEnd =
          Number(
            original.angleEnd
          );

        if (
          !Number.isFinite(
            radius
          ) ||
          radius <= 0 ||
          !Number.isFinite(
            angleStart
          ) ||
          !Number.isFinite(
            angleEnd
          )
        ) {
          newObjects.push(
            original
          );

          return;
        }

        let sweep =
          angleEnd -
          angleStart;

        if (
          Math.abs(sweep) <
          0.000001
        ) {
          newObjects.push(
            original
          );

          return;
        }

        const steps =
          Math.max(
            8,
            Math.min(
              64,
              Math.ceil(
                Math.abs(
                  sweep
                ) /
                  (Math.PI / 18)
              )
            )
          );

        const lines = [];

        for (
          let i = 0;
          i < steps;
          i++
        ) {
          const t1 =
            i / steps;

          const t2 =
            (i + 1) /
            steps;

          const a1 =
            angleStart +
            sweep * t1;

          const a2 =
            angleStart +
            sweep * t2;

          const x1 =
            original.x +
            radius *
              Math.cos(a1);

          const y1 =
            original.y +
            radius *
              Math.sin(a1);

          const x2 =
            original.x +
            radius *
              Math.cos(a2);

          const y2 =
            original.y +
            radius *
              Math.sin(a2);

          lines.push({
            type: "line",

            points: [
              x1,
              y1,
              x2,
              y2,
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

            locked: false,
            hidden: false,
          });
        }

        const startIndex =
          newObjects.length;

        newObjects.push(
          ...lines
        );

        for (
          let i = 0;
          i < lines.length;
          i++
        ) {
          newSelectedIndexes.push(
            startIndex + i
          );
        }

        return;
      }

      /* =========================
   ELLIPSE → LINE SEGMENTS
========================= */

if (
  original.type === "ellipse"
) {
  const centerX = Number(original.x);
  const centerY = Number(original.y);

  const radiusX = Number(original.radiusX);
  const radiusY = Number(original.radiusY);

  const rotation =
    (Number(original.rotation) || 0) *
    (Math.PI / 180);

  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(radiusX) ||
    !Number.isFinite(radiusY) ||
    radiusX <= 0 ||
    radiusY <= 0
  ) {
    newObjects.push(original);
    return;
  }

  const steps = 64;
  const lines = [];

  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);

  for (let i = 0; i < steps; i++) {
    const a1 = (i / steps) * Math.PI * 2;
    const a2 = ((i + 1) / steps) * Math.PI * 2;

    const localX1 = radiusX * Math.cos(a1);
    const localY1 = radiusY * Math.sin(a1);

    const localX2 = radiusX * Math.cos(a2);
    const localY2 = radiusY * Math.sin(a2);

    const x1 =
      centerX +
      localX1 * cosRotation -
      localY1 * sinRotation;

    const y1 =
      centerY +
      localX1 * sinRotation +
      localY1 * cosRotation;

    const x2 =
      centerX +
      localX2 * cosRotation -
      localY2 * sinRotation;

    const y2 =
      centerY +
      localX2 * sinRotation +
      localY2 * cosRotation;

    lines.push({
      type: "line",

      points: [
        x1,
        y1,
        x2,
        y2,
      ],

      rotation: 0,

      color:
        original.color || "#ffffff",

      strokeWidth:
        original.strokeWidth || 2,

      layerId:
        original.layerId || activeLayerId,

      locked: false,
      hidden: false,
    });
  }

  const startIndex = newObjects.length;

  newObjects.push(...lines);

  for (let i = 0; i < lines.length; i++) {
    newSelectedIndexes.push(startIndex + i);
  }

  return;
}

      /* OTHER OBJECTS */

      window.alert(
        `${original.type} cannot be exploded further.`
      );

      newObjects.push(
        original
      );
    }
  );

  setObjects(
    newObjects
  );

  if (
    newSelectedIndexes.length > 0
  ) {
    setSelectedIndexes(
      newSelectedIndexes
    );

    setSelectedIndex(
      newSelectedIndexes[
        newSelectedIndexes.length - 1
      ]
    );
  } else {
    setSelectedIndexes([]);
    setSelectedIndex(null);
  }

  saveHistory(
    previousObjects,
    [...measurements]
  );
};

/* =========================
   MOVE
========================= */

const startMove = (
  index,
  event
) => {
  if (
    tool !== "move"
  ) {
    return;
  }

  const object =
    objects[index];

  if (!object) {
    return;
  }

  /* =========================
     CLICKED OBJECT CHECK
  ========================= */

  if (
    object.hidden
  ) {
    window.alert(
      "This object is hidden."
    );
    return;
  }

  if (
    isObjectLocked(index)
  ) {
    window.alert(
      "This object or its layer is locked."
    );
    return;
  }

  /* =========================
     SELECTED OBJECTS
  ========================= */

  const requestedIndexes =
    selectedIndexes.length > 0 &&
    selectedIndexes.includes(index)
      ? [...selectedIndexes]
      : [index];

  /* =========================
     ONLY VISIBLE + EDITABLE
  ========================= */

  const indexesToMove =
    requestedIndexes.filter(
      (objectIndex) => {
        const selectedObject =
          objects[objectIndex];

        if (
          !selectedObject ||
          selectedObject.hidden
        ) {
          return false;
        }

        if (
          isObjectLocked(
            objectIndex
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    indexesToMove.length === 0
  ) {
    window.alert(
      "No unlocked visible objects can be moved."
    );
    return;
  }

  /* =========================
     STAGE
  ========================= */

  const stage =
    event.target.getStage();

  if (!stage) {
    return;
  }

  const pointer =
    stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  /* =========================
     START POINTER
  ========================= */

  const startX =
    (pointer.x - position.x) /
    scale;

  const startY =
    (pointer.y - position.y) /
    scale;

  /* =========================
     SAVE MOVE STATE
  ========================= */

  moveStartRef.current = {
    index,

    indexes:
      indexesToMove,

    startPointer: {
      x: startX,
      y: startY,
    },

    objects:
      JSON.parse(
        JSON.stringify(
          objects
        )
      ),

    measurements:
      [...measurements],

    moved: false,
  };

  setSelectedIndexes(
    indexesToMove
  );

  setSelectedIndex(
    index
  );
};

/* =========================
   UPDATE MOVE
========================= */

const updateMove = (
  e
) => {
  if (
    tool !== "move" ||
    !moveStartRef.current
  ) {
    return;
  }

  const stage =
    e.target.getStage();

  if (!stage) {
    return;
  }

  const pointer =
    stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  const currentX =
    (pointer.x - position.x) /
    scale;

  const currentY =
    (pointer.y - position.y) /
    scale;

  const startData =
    moveStartRef.current;

  const dx =
    currentX -
    startData.startPointer.x;

  const dy =
    currentY -
    startData.startPointer.y;

  if (
    dx !== 0 ||
    dy !== 0
  ) {
    moveStartRef.current.moved =
      true;
  }

  /* =========================
     ONLY VISIBLE + UNLOCKED
     OBJECTS MOVE
  ========================= */

  const editableIndexes =
    startData.indexes.filter(
      (objectIndex) => {
        const original =
          startData.objects[
            objectIndex
          ];

        if (
          !original ||
          original.hidden
        ) {
          return false;
        }

        if (
          original.locked
        ) {
          return false;
        }

        const layerId =
          original.layerId ||
          "layer-0";

        if (
          isLayerLocked(
            layerId
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    return;
  }

  const moveSet =
    new Set(
      editableIndexes
    );

  const updatedObjects =
    startData.objects.map(
      (
        original,
        objectIndex
      ) => {

        if (
          !moveSet.has(
            objectIndex
          )
        ) {
          return original;
        }

        /* =========================
           LINE
        ========================= */

        if (
          original.type ===
            "line" &&
          original.points?.length >=
            4
        ) {
          return {
            ...original,

            points: [
              original.points[0] +
                dx,

              original.points[1] +
                dy,

              original.points[2] +
                dx,

              original.points[3] +
                dy,
            ],
          };
        }

        /* =========================
           POLYLINE
        ========================= */

        if (
          original.type ===
            "polyline" &&
          original.points?.length >=
            2
        ) {
          return {
            ...original,

            points:
              original.points.map(
                (
                  value,
                  pointIndex
                ) =>
                  pointIndex % 2 ===
                  0
                    ? value + dx
                    : value + dy
              ),
          };
        }

        /* =========================
           OTHER OBJECTS
        ========================= */

        return {
          ...original,

          x:
            (original.x || 0) +
            dx,

          y:
            (original.y || 0) +
            dy,
        };
      }
    );

  setObjects(
    updatedObjects
  );
};

/* =========================
   FINISH MOVE
========================= */

const finishMove = () => {
  const moveData =
    moveStartRef.current;

  if (!moveData) {
    return;
  }

  /* =========================
     SAVE HISTORY ONLY IF MOVED
  ========================= */

  if (moveData.moved) {
    saveHistory(
      moveData.objects,
      moveData.measurements
    );
  }

  /* =========================
     CLEAR MOVE STATE
  ========================= */

  moveStartRef.current = null;
};

/* =========================
   UNION
========================= */

const unionObjects = () => {
  const indexes =
    selectedIndexes.length > 0
      ? [...selectedIndexes]
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length < 2) {
    window.alert(
      "Select at least two objects."
    );
    return;
  }

  const selectedObjects = indexes
    .map((index) => objects[index])
    .filter(Boolean);

  if (selectedObjects.length < 2) {
    return;
  }

  const supportedTypes = [
    "line",
    "polyline",
    "rectangle",
    "circle",
    "arc",
  ];

  const unsupported =
    selectedObjects.some(
      (object) =>
        !supportedTypes.includes(
          object.type
        )
    );

  if (unsupported) {
    window.alert(
      "UNION supports Line, Polyline, Rectangle, Circle and Arc."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const baseObject =
    selectedObjects[0];

  const unionObject = {
    ...baseObject,

    type: "polyline",

    points: selectedObjects.flatMap(
      (object) => {
        if (
          Array.isArray(
            object.points
          )
        ) {
          return object.points;
        }

        if (
          object.type ===
            "rectangle"
        ) {
          const x =
            Number(object.x || 0);

          const y =
            Number(object.y || 0);

          const width =
            Number(
              object.width || 0
            );

          const height =
            Number(
              object.height || 0
            );

          return [
            x,
            y,
            x + width,
            y,
            x + width,
            y + height,
            x,
            y + height,
            x,
            y,
          ];
        }

        if (
          object.type ===
          "circle"
        ) {
          const x =
            Number(object.x || 0);

          const y =
            Number(object.y || 0);

          const radius =
            Number(
              object.radius || 0
            );

          return [
            x + radius,
            y,
            x,
            y + radius,
            x - radius,
            y,
            x,
            y - radius,
            x + radius,
            y,
          ];
        }

        return [];
      }
    ),

    closed: false,

    color:
      baseObject.color ||
      "#ffffff",

    strokeWidth:
      baseObject.strokeWidth ||
      1,

    layerId:
      baseObject.layerId ||
      activeLayerId,
  };

  const firstIndex =
    Math.min(...indexes);

  const indexSet =
    new Set(indexes);

  const updatedObjects =
    objects.filter(
      (_, index) =>
        !indexSet.has(index)
    );

  updatedObjects.splice(
    firstIndex,
    0,
    unionObject
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    firstIndex
  );

  setSelectedIndexes([
    firstIndex,
  ]);

  setFuture([]);

  changeTool("select");
};


/* =========================
   INTERSECT
========================= */

const intersectObjects = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length < 2) {
    window.alert(
      "Select at least two objects."
    );
    return;
  }

  const selectedObjects =
    indexes
      .map((index) => objects[index])
      .filter(Boolean);

  if (selectedObjects.length < 2) {
    return;
  }

  const getBounds = (object) => {
    if (
      object.type === "rectangle"
    ) {
      return {
        minX: Number(object.x || 0),
        minY: Number(object.y || 0),
        maxX:
          Number(object.x || 0) +
          Number(object.width || 0),
        maxY:
          Number(object.y || 0) +
          Number(object.height || 0),
      };
    }

    if (
      object.type === "circle"
    ) {
      const x = Number(object.x || 0);
      const y = Number(object.y || 0);
      const r = Number(object.radius || 0);

      return {
        minX: x - r,
        minY: y - r,
        maxX: x + r,
        maxY: y + r,
      };
    }

    if (
      Array.isArray(object.points) &&
      object.points.length >= 2
    ) {
      const xs = [];
      const ys = [];

      for (
        let i = 0;
        i < object.points.length;
        i += 2
      ) {
        xs.push(
          Number(object.points[i])
        );
        ys.push(
          Number(object.points[i + 1])
        );
      }

      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }

    return null;
  };

  const bounds =
    selectedObjects
      .map(getBounds)
      .filter(Boolean);

  if (bounds.length < 2) {
    window.alert(
      "INTERSECT supports Rectangle, Circle, Line and Polyline."
    );
    return;
  }

  let minX = -Infinity;
  let minY = -Infinity;
  let maxX = Infinity;
  let maxY = Infinity;

  bounds.forEach((box) => {
    minX = Math.max(
      minX,
      box.minX
    );

    minY = Math.max(
      minY,
      box.minY
    );

    maxX = Math.min(
      maxX,
      box.maxX
    );

    maxY = Math.min(
      maxY,
      box.maxY
    );
  });

  if (
    minX >= maxX ||
    minY >= maxY
  ) {
    window.alert(
      "The selected objects do not intersect."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const intersection = {
    type: "rectangle",
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    color:
      selectedObjects[0].color ||
      "#ffffff",
    strokeWidth:
      selectedObjects[0].strokeWidth || 1,
    fill:
      selectedObjects[0].fill ||
      undefined,
    layerId:
      selectedObjects[0].layerId ||
      activeLayerId,
  };

  const updatedObjects =
    objects.filter(
      (_, index) =>
        !indexes.includes(index)
    );

  const newIndex =
    updatedObjects.length;

  updatedObjects.push(
    intersection
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  setFuture([]);
};

  /* =========================
     JOIN
  ========================= */

  const joinObject = (
    firstIndex,
    secondIndex
  ) => {
    const first =
      objects[firstIndex];

    const second =
      objects[secondIndex];

        /* =========================
     JOIN SELECTION VALIDATION
  ========================= */

  if (
    firstIndex === null ||
    secondIndex === null ||
    firstIndex === secondIndex
  ) {
    window.alert(
      "Select two different objects for Join."
    );
    return;
  }

  if (
    !first ||
    !second
  ) {
    window.alert(
      "Selected objects were not found."
    );
    return;
  }

  /* =========================
     OBJECT LOCK CHECK
  ========================= */

  if (
    first.locked ||
    second.locked
  ) {
    window.alert(
      "One or both selected objects are locked."
    );
    return;
  }

  /* =========================
     LAYER LOCK CHECK
  ========================= */

  const firstLayerId =
    first.layerId ||
    "layer-0";

  const secondLayerId =
    second.layerId ||
    "layer-0";

  if (
    isLayerLocked(
      firstLayerId
    ) ||
    isLayerLocked(
      secondLayerId
    )
  ) {
    window.alert(
      "One or both selected objects are on locked layers."
    );
    return;
  }



/* =========================
   HATCH + HATCH JOIN
========================= */

if (
  first.type === "hatch" &&
  second.type === "hatch"
) {
  const firstX =
    Number(first.x) || 0;

  const firstY =
    Number(first.y) || 0;

  const firstW =
    Number(first.width) || 0;

  const firstH =
    Number(first.height) || 0;

  const secondX =
    Number(second.x) || 0;

  const secondY =
    Number(second.y) || 0;

  const secondW =
    Number(second.width) || 0;

  const secondH =
    Number(second.height) || 0;

  const minX =
    Math.min(
      firstX,
      secondX
    );

  const minY =
    Math.min(
      firstY,
      secondY
    );

  const maxX =
    Math.max(
      firstX + firstW,
      secondX + secondW
    );

  const maxY =
    Math.max(
      firstY + firstH,
      secondY + secondH
    );

  const mergedHatch = {
    ...first,

    x: minX,
    y: minY,

    width:
      maxX - minX,

    height:
      maxY - minY,

    hatchSpacing:
      first.hatchSpacing ||
      second.hatchSpacing ||
      12,

    hatchAngle:
      first.hatchAngle ??
      second.hatchAngle ??
      45,

    hatchColor:
      first.hatchColor ||
      second.hatchColor ||
      "#00aaff",

    trimEnabled: false,
    trimStartPoint: null,
    trimEndPoint: null,
    trimPoint: null,

    locked: false,
    hidden: false,
  };

  const previousObjects = [
    ...objects,
  ];

  const newObjects =
    objects.filter(
      (_, i) =>
        i !== firstIndex &&
        i !== secondIndex
    );

  newObjects.push(
    mergedHatch
  );

  setObjects(
    newObjects
  );

  const newIndex =
    newObjects.length - 1;

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  return;
}

    /* =========================
   ARC + ARC JOIN
========================= */

if (
  first.type === "arc" &&
  second.type === "arc"
) {
  const sameCenter =
    Math.hypot(
      first.x - second.x,
      first.y - second.y
    ) < 0.5;

  const sameRadius =
    Math.abs(
      first.radius -
      second.radius
    ) < 0.5;

  if (
    !sameCenter ||
    !sameRadius
  ) {
    window.alert(
      "Arcs must have the same center and radius."
    );

    return;
  }

  const pointAtAngle = (
    arc,
    angle
  ) => ({
    x:
      arc.x +
      arc.radius *
        Math.cos(angle),

    y:
      arc.y +
      arc.radius *
        Math.sin(angle),
  });

  const firstStart =
    pointAtAngle(
      first,
      first.angleStart
    );

  const firstEnd =
    pointAtAngle(
      first,
      first.angleEnd
    );

  const secondStart =
    pointAtAngle(
      second,
      second.angleStart
    );

  const secondEnd =
    pointAtAngle(
      second,
      second.angleEnd
    );

  const tolerance = 25;

  /* FIRST END → SECOND START */

  const endStartDistance =
    Math.hypot(
      firstEnd.x -
        secondStart.x,

      firstEnd.y -
        secondStart.y
    );

  if (
    endStartDistance <=
    tolerance
  ) {
    const previousObjects = [
      ...objects,
    ];

    const mergedArc = {
      ...first,

      x: first.x,
      y: first.y,
      radius: first.radius,

      angleStart:
        first.angleStart,

      angleEnd:
        second.angleEnd,

      rotation: 0,
    };

    const newObjects =
      objects.filter(
        (_, i) =>
          i !== firstIndex &&
          i !== secondIndex
      );

    newObjects.push(
      mergedArc
    );

    setObjects(
      newObjects
    );

    const newIndex =
      newObjects.length - 1;

    setSelectedIndex(
      newIndex
    );

    setSelectedIndexes([
      newIndex,
    ]);

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  /* FIRST START → SECOND END */

  const startEndDistance =
    Math.hypot(
      firstStart.x -
        secondEnd.x,

      firstStart.y -
        secondEnd.y
    );

  if (
    startEndDistance <=
    tolerance
  ) {
    const previousObjects = [
      ...objects,
    ];

    const mergedArc = {
      ...first,

      x: first.x,
      y: first.y,
      radius: first.radius,

      angleStart:
        second.angleStart,

      angleEnd:
        first.angleEnd,

      rotation: 0,
    };

    const newObjects =
      objects.filter(
        (_, i) =>
          i !== firstIndex &&
          i !== secondIndex
      );

    newObjects.push(
      mergedArc
    );

    setObjects(
      newObjects
    );

    const newIndex =
      newObjects.length - 1;

    setSelectedIndex(
      newIndex
    );

    setSelectedIndexes([
      newIndex,
    ]);

    saveHistory(
      previousObjects,
      [...measurements]
    );

    return;
  }

  window.alert(
    "Arcs must have connected endpoints to join."
  );

  return;
}

    const firstValid =
      first.type === "line" ||
      first.type === "polyline";

    const secondValid =
      second.type === "line" ||
      second.type === "polyline";

    if (!firstValid || !secondValid) {
      window.alert(
        "Join works with lines and polylines only."
      );
      return;
    }

    const p1 = [...first.points];
    const p2 = [...second.points];

    const distance = (
      x1, y1, x2, y2
    ) =>
      Math.hypot(
        x2 - x1,
        y2 - y1
      );

    const reversePoints = (points) => {
      const reversed = [];
      for (
        let i = points.length - 2;
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

    const p1Start = [p1[0], p1[1]];
    const p1End = [
      p1[p1.length - 2],
      p1[p1.length - 1],
    ];
    const p2Start = [p2[0], p2[1]];
    const p2End = [
      p2[p2.length - 2],
      p2[p2.length - 1],
    ];

    const cases = [
      {
        type: "end-start",
        distance: distance(
          ...p1End,
          ...p2Start
        ),
      },
      {
        type: "end-end",
        distance: distance(
          ...p1End,
          ...p2End
        ),
      },
      {
        type: "start-start",
        distance: distance(
          ...p1Start,
          ...p2Start
        ),
      },
      {
        type: "start-end",
        distance: distance(
          ...p1Start,
          ...p2End
        ),
      },
    ];

    cases.sort(
      (a, b) =>
        a.distance - b.distance
    );

    const best = cases[0];

  if (best.distance > 50) {
  window.alert("Objects are not connected.");
  return;
}

    let joinedPoints = null;

    if (best.type === "end-start") {
      joinedPoints = [
        ...p1,
        ...p2.slice(2),
      ];
    } else if (best.type === "end-end") {
      const rp2 = reversePoints(p2);
      joinedPoints = [
        ...p1,
        ...rp2.slice(2),
      ];
    } else if (best.type === "start-start") {
      const rp1 = reversePoints(p1);
      joinedPoints = [
        ...rp1,
        ...p2.slice(2),
      ];
    } else if (best.type === "start-end") {
      const rp1 = reversePoints(p1);
      const rp2 = reversePoints(p2);
      joinedPoints = [
        ...rp1,
        ...rp2.slice(2),
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

    const newObjects = objects.filter(
      (_, i) =>
        i !== firstIndex &&
        i !== secondIndex
    );

    newObjects.push({
      type: "polyline",
      points: joinedPoints,
      rotation: 0,
      color: first.color || "#ffffff",
      strokeWidth: first.strokeWidth || 2,
      layerId: first.layerId || activeLayerId,
    });

    setObjects(newObjects);
   const newIndex =
  newObjects.length - 1;

setSelectedIndex(
  newIndex
);

setSelectedIndexes([
  newIndex,
]);
    saveHistory(
      previousObjects,
      [...measurements]
    );
  };

  /* =========================
     STRETCH
  ========================= */

  const startStretch = (
    index,
    handle
  ) => {
    if (
  tool !== "stretch" &&
  tool !== "select"
) {
  return;
}
if (isObjectLocked(index)) {
  window.alert(
    "This object is locked."
  );
  return;
}

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
    setSelectedIndexes([index]);
  };

  const updateStretch = (
    index,
    handle,
    e
  ) => {
    if (
  tool !== "stretch" &&
  tool !== "select"
) {
  return;
}

if (
  isObjectLocked(index)
) {
  return;
}
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

 const gripPoint =
  objectSnapEnabled
    ? snapToObject(
        rawX,
        rawY
      )
    : {
        x: snapToGrid(rawX),
        y: snapToGrid(rawY),
      };

const x = gripPoint.x;
const y = gripPoint.y;

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

/* ARC */

if (object.type === "arc") {

  /* CENTER */

  if (handle === "center") {
    object.x = x;
    object.y = y;
  }
    /* MID */

  if (handle === "mid") {

    const dx =
      x - startObject.x;

    const dy =
      y - startObject.y;

    const newRadius =
      Math.max(
        20,
        Math.hypot(
          dx,
          dy
        )
      );

    object.radius =
      newRadius;
  }

  /* START / END */

  if (
    handle === "start" ||
    handle === "end"
  ) {
    const dx =
      x - startObject.x;

    const dy =
      y - startObject.y;

    const newRadius =
      Math.max(
        20,
        Math.hypot(
          dx,
          dy
        )
      );

    const newAngle =
      Math.atan2(
        dy,
        dx
      );

    object.radius =
      newRadius;

    if (handle === "start") {
      object.angleStart =
        newAngle;
    }

    if (handle === "end") {
      object.angleEnd =
        newAngle;
    }
  }
}

/* SCALE GRIP */

if (handle === "scale-grip") {
  const startObject = startData.object;

  let centerX = 0;
  let centerY = 0;

  /* LINE */
  if (
    startObject.type === "line"
  ) {
    centerX =
      (startObject.points[0] +
        startObject.points[2]) / 2;

    centerY =
      (startObject.points[1] +
        startObject.points[3]) / 2;
  }

  /* POLYLINE */
  else if (
    startObject.type === "polyline"
  ) {
    const xs = [];
    const ys = [];

    for (
      let i = 0;
      i < startObject.points.length;
      i += 2
    ) {
      xs.push(startObject.points[i]);
      ys.push(startObject.points[i + 1]);
    }

    centerX =
      (Math.min(...xs) +
        Math.max(...xs)) / 2;

    centerY =
      (Math.min(...ys) +
        Math.max(...ys)) / 2;
  }

  /* RECTANGLE */
  else if (
    startObject.type === "rectangle"
  ) {
    centerX =
      startObject.x +
      startObject.width / 2;

    centerY =
      startObject.y +
      startObject.height / 2;
  }

  /* CIRCLE / ARC */
  else if (
    startObject.type === "circle" ||
    startObject.type === "arc"
  ) {
    centerX = startObject.x;
    centerY = startObject.y;
  }

  {/* ROTATE GRIP */}
<Circle
  x={
    selectedObject.x +
    Math.cos(
      (((selectedObject.rotation || 0) - 90) * Math.PI) / 180
    ) * 55
  }
  y={
    selectedObject.y +
    Math.sin(
      (((selectedObject.rotation || 0) - 90) * Math.PI) / 180
    ) * 55
  }
  radius={12 / scale}
  fill="#ff9900"
  draggable={tool === "move"}
  onMouseDown={(e) => {
    e.cancelBubble = true;
    startStretch(selectedIndex, "rotate-grip");
  }}
  onDragMove={(e) =>
    updateStretch(selectedIndex, "rotate-grip", e)
  }
  onDragEnd={endStretch}
/>
/* =========================
   ROTATE GRIP
========================= */

if (handle === "rotate-grip") {
}

/* =========================
   ROTATE GRIP
========================= */

if (handle === "rotate-grip") {
  let centerX = 0;
  let centerY = 0;

  if (
    startObject.type === "circle" ||
    startObject.type === "arc"
  ) {
    centerX = startObject.x;
    centerY = startObject.y;
  }

  else if (startObject.type === "rectangle") {
    centerX =
      startObject.x + startObject.width / 2;
    centerY =
      startObject.y + startObject.height / 2;
  }

  else if (startObject.type === "line") {
    centerX =
      (startObject.points[0] +
        startObject.points[2]) / 2;

    centerY =
      (startObject.points[1] +
        startObject.points[3]) / 2;
  }

  else if (startObject.type === "polyline") {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (
      let i = 0;
      i < startObject.points.length;
      i += 2
    ) {
      minX = Math.min(
        minX,
        startObject.points[i]
      );

      maxX = Math.max(
        maxX,
        startObject.points[i]
      );

      minY = Math.min(
        minY,
        startObject.points[i + 1]
      );

      maxY = Math.max(
        maxY,
        startObject.points[i + 1]
      );
    }

    centerX = (minX + maxX) / 2;
    centerY = (minY + maxY) / 2;
  }

  else if (startObject.type === "text") {
    centerX = startObject.x;
    centerY = startObject.y;
  }

  const dx = x - centerX;
  const dy = y - centerY;

  const newAngle =
    Math.atan2(dy, dx) *
    (180 / Math.PI);

  object.rotation = newAngle;
}
  /* TEXT */
  else if (
    startObject.type === "text"
  ) {
    centerX = startObject.x;
    centerY = startObject.y;
  }

  const startDistance =
    Math.max(
      1,
      Math.hypot(
        startObject.x !== undefined
          ? startObject.x - centerX
          : startObject.points[0] -
              centerX,

        startObject.y !== undefined
          ? startObject.y - centerY
          : startObject.points[1] -
              centerY
      )
    );

  const currentDistance =
    Math.max(
      1,
      Math.hypot(
        x - centerX,
        y - centerY
      )
    );

  const factor =
    currentDistance /
    startDistance;

  if (
    !Number.isFinite(factor) ||
    factor <= 0
  ) {
    return;
  }

  /* LINE */

  if (
    startObject.type === "line"
  ) {
    object.points = [
      centerX +
        (startObject.points[0] -
          centerX) *
          factor,

      centerY +
        (startObject.points[1] -
          centerY) *
          factor,

      centerX +
        (startObject.points[2] -
          centerX) *
          factor,

      centerY +
        (startObject.points[3] -
          centerY) *
          factor,
    ];
  }

  /* POLYLINE */

  else if (
    startObject.type === "polyline"
  ) {
    object.points =
      startObject.points.map(
        (value, pointIndex) => {
          if (
            pointIndex % 2 === 0
          ) {
            return (
              centerX +
              (value - centerX) *
                factor
            );
          }

          return (
            centerY +
            (value - centerY) *
              factor
          );
        }
      );
  }

  /* RECTANGLE */

  else if (
    startObject.type === "rectangle"
  ) {
    object.x =
      centerX +
      (startObject.x -
        centerX) *
        factor;

    object.y =
      centerY +
      (startObject.y -
        centerY) *
        factor;

    object.width =
      startObject.width *
      factor;

    object.height =
      startObject.height *
      factor;
  }

  /* CIRCLE */

  else if (
    startObject.type === "circle"
  ) {
    object.x =
      centerX +
      (startObject.x -
        centerX) *
        factor;

    object.y =
      centerY +
      (startObject.y -
        centerY) *
        factor;

    object.radius =
      startObject.radius *
      factor;
  }

  /* ELLIPSE */

else if (
  startObject.type === "ellipse"
) {
  object.x =
    centerX +
    (
      startObject.x -
      centerX
    ) * factor;

  object.y =
    centerY +
    (
      startObject.y -
      centerY
    ) * factor;

  object.radiusX =
    startObject.radiusX *
    factor;

  object.radiusY =
    startObject.radiusY *
    factor;
}

  /* ARC */

  else if (
    startObject.type === "arc"
  ) {
    object.x =
      centerX +
      (startObject.x -
        centerX) *
        factor;

    object.y =
      centerY +
      (startObject.y -
        centerY) *
        factor;

    object.radius =
      startObject.radius *
      factor;
  }

  /* TEXT */

  else if (
    startObject.type === "text"
  ) {
    object.x =
      centerX +
      (startObject.x -
        centerX) *
        factor;

    object.y =
      centerY +
      (startObject.y -
        centerY) *
        factor;

    object.fontSize =
      Math.max(
        8,
        (startObject.fontSize ||
          24) *
          factor
      );
  }
}

/* TEXT */
if (object.type === "text") {

  const startFontSize =
    Number(startObject.fontSize || 24);

  const startY = startObject.y;

  /* FONT SIZE */
  if (handle === "text") {
    const newFontSize = Math.max(
      8,
      Math.min(
        200,
        startFontSize +
          (y - startY)
      )
    );

    object.fontSize = newFontSize;
  }

  /* ROTATION */
  if (handle === "text-rotate") {

    const dx =
      x - startObject.x;

    const dy =
      y - startObject.y;

    const newAngle =
      Math.atan2(dy, dx) *
      (180 / Math.PI);

    object.rotation =
      newAngle;
  }
}

/* POLYLINE */

      if (
        object.type ===
        "polyline"
      ) {
        if (
          handle &&
          handle.startsWith(
            "point-"
          )
        ) {
          const pointIndex =
            Number(
              handle.replace(
                "point-",
                ""
              )
            );

          const pointPosition =
            pointIndex * 2;

          if (
            pointPosition >= 0 &&
            pointPosition + 1 <
              object.points.length
          ) {
            object.points = [
              ...startObject.points,
            ];

            object.points[
              pointPosition
            ] = x;

            object.points[
              pointPosition + 1
            ] = y;
          }
        }
      }

      updated[index] =
        object;

      return updated;
    });
  };

  const endStretch = () => {
   if (
  tool !== "stretch" &&
  tool !== "select"
) {
  return;
}
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
    locked: false,
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

  /* =========================
   TOGGLE LAYER VISIBILITY
========================= */

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

  /* =========================
     CLEAR SELECTIONS
     FROM THIS LAYER
  ========================= */

  const selectedLayerIndexes =
    objects
      .map((object, index) => {
        const objectLayerId =
          object?.layerId ||
          "layer-0";

        return objectLayerId ===
          layerId
          ? index
          : null;
      })
      .filter(
        (index) =>
          index !== null
      );

  const selectedLayerSet =
    new Set(
      selectedLayerIndexes
    );

  const remainingSelected =
    selectedIndexes.filter(
      (index) =>
        !selectedLayerSet.has(
          index
        )
    );

  setSelectedIndexes(
    remainingSelected
  );

  if (
    selectedIndex !== null &&
    selectedLayerSet.has(
      selectedIndex
    )
  ) {
    setSelectedIndex(
      remainingSelected.length > 0
        ? remainingSelected[
            remainingSelected.length - 1
          ]
        : null
    );
  }
};

/* =========================
   TOGGLE LAYER LOCK
========================= */

const toggleLayerLock = (
  layerId
) => {
  const layer =
    layers.find(
      (item) =>
        item.id === layerId
    );

  if (!layer) {
    return;
  }

  /* =========================
     LAYER 0 CANNOT LOCK
  ========================= */

  if (
    layer.id === "layer-0"
  ) {
    window.alert(
      "Layer 0 cannot be locked."
    );
    return;
  }

  /* =========================
     TOGGLE LOCK
  ========================= */

  setLayers(
    (previousLayers) =>
      previousLayers.map(
        (item) =>
          item.id === layerId
            ? {
                ...item,
                locked:
                  !item.locked,
              }
            : item
      )
  );

  /* =========================
     LOCKING THIS LAYER
     CLEAR ITS SELECTION
  ========================= */

  if (
    !layer.locked
  ) {
    const layerIndexes =
      objects
        .map(
          (object, index) => {
            const objectLayerId =
              object?.layerId ||
              "layer-0";

            return objectLayerId ===
              layerId
              ? index
              : null;
          }
        )
        .filter(
          (index) =>
            index !== null
        );

    const layerIndexSet =
      new Set(
        layerIndexes
      );

    const remainingSelected =
      selectedIndexes.filter(
        (index) =>
          !layerIndexSet.has(
            index
          )
      );

    setSelectedIndexes(
      remainingSelected
    );

    if (
      selectedIndex !== null &&
      layerIndexSet.has(
        selectedIndex
      )
    ) {
      setSelectedIndex(
        remainingSelected.length > 0
          ? remainingSelected[
              remainingSelected.length - 1
            ]
          : null
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
  const indexesToMove =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexesToMove.length === 0
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const targetLayer =
    layers.find(
      (layer) =>
        layer.id === layerId
    );

  if (!targetLayer) {
    window.alert(
      "Target layer not found."
    );
    return;
  }

  if (targetLayer.locked) {
    window.alert(
      "Target layer is locked."
    );
    return;
  }

  const editableIndexes =
    indexesToMove.filter(
      (index) =>
        objects[index] &&
        !isObjectLocked(index)
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const moveSet =
    new Set(
      editableIndexes
    );

  const previousObjects =
    [...objects];

  const updatedObjects =
    objects.map(
      (object, index) =>
        moveSet.has(index)
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

  setSelectedIndexes(
    editableIndexes
  );

  setSelectedIndex(
    editableIndexes[
      editableIndexes.length - 1
    ]
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
    selectedIndex === null ||
    selectedIndex === undefined
  ) {
    return;
  }

  const indexesToUpdate =
    selectedIndexes.length > 0
      ? selectedIndexes
      : [selectedIndex];

  const editableIndexes =
  indexesToUpdate.filter(
    (index) => {
      const object =
        objects[index];

      if (!object) {
        return false;
      }

      if (object.locked) {
        return false;
      }

      const objectLayerId =
        object.layerId ||
        "layer-0";

      if (
        isLayerLocked(
          objectLayerId
        )
      ) {
        return false;
      }

      return true;
    }
  );

 if (
  editableIndexes.length === 0
) {
  window.alert(
    "Selected object or its layer is locked."
  );
  return;
}

  const previousObjects = [
    ...objects,
  ];

  let finalValue = value;

 if (
  property === "strokeWidth" ||
  property === "rotation" ||
  property === "radius" ||
  property === "width" ||
  property === "height" ||
  property === "x" ||
  property === "y" ||
  property === "fontSize" ||
  property === "hatchSpacing" ||
  property === "hatchAngle"
) {
  finalValue = Number(value);
}

  const updateSet =
    new Set(editableIndexes);

  const updatedObjects =
    objects.map(
      (object, index) => {
        if (
          !updateSet.has(index)
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
  const indexesToDelete =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexesToDelete.length === 0 &&
    selectedMeasurementIndex === null
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const previousMeasurements = [
    ...measurements,
  ];

  /* =========================
     DELETE MEASUREMENT
  ========================= */

  if (
    selectedMeasurementIndex !== null
  ) {
    const newMeasurements =
      measurements.filter(
        (_, index) =>
          index !==
          selectedMeasurementIndex
      );

    setMeasurements(
      newMeasurements
    );

    saveHistory(
      previousObjects,
      previousMeasurements
    );

    setSelectedMeasurementIndex(
      null
    );

    setFuture([]);

    return;
  }

  /* =========================
     FILTER EDITABLE OBJECTS
  ========================= */

  const deletableIndexes =
    indexesToDelete.filter(
      (index) => {
        const object =
          objects[index];

        if (!object) {
          return false;
        }

        /* OBJECT LOCK */
        if (
          object.locked
        ) {
          return false;
        }

        /* LAYER LOCK */
        const objectLayerId =
          object.layerId ||
          "layer-0";

        if (
          isLayerLocked(
            objectLayerId
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    deletableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  /* =========================
     DELETE OBJECTS
  ========================= */

  const deleteSet =
    new Set(
      deletableIndexes
    );

  const newObjects =
    objects.filter(
      (_, index) =>
        !deleteSet.has(index)
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

  setSelectedIndexes([]);

  setSelectedMeasurementIndex(
    null
  );

  setFuture([]);
};

/* =========================
   CENTER CAD VIEW
========================= */

const getCenterPosition = () => ({
  x:
    (viewportSize.width <= 768
      ? viewportSize.width
      : viewportSize.width - 298) / 2,

  y:
    (viewportSize.width <= 768
      ? viewportSize.height - 87 - 64
      : viewportSize.height - 87) / 2,
});

const resetViewPosition = () => {
  setPosition(getCenterPosition());
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

  const confirmClear =
    window.confirm(
      "Are you sure you want to clear the entire drawing?"
    );

  if (!confirmClear) {
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
  setAnglePoints([]);

  setSelectedIndex(null);
  setSelectedIndexes([]);

  setSelectedMeasurementIndex(
    null
  );

  setCommandFirstIndex(null);

  setIsDrawing(false);

  setSnapPoint(null);

  actionStartRef.current =
    null;

  stretchStartRef.current =
    null;

  moveStartRef.current =
    null;

  setScale(1);

  resetViewPosition();

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
  const wheelEvent = e.evt;

  if (!wheelEvent) {
    return;
  }

  wheelEvent.preventDefault();

  const stage =
    e.target.getStage();

  if (!stage) {
    return;
  }

  const pointer =
    stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  const oldScale = scale;

  /* =========================
     TOUCHPAD / MOUSE ZOOM
  ========================= */

  let zoomFactor;

  /*
    Ctrl / Meta = touchpad pinch
  */

  if (
    wheelEvent.ctrlKey ||
    wheelEvent.metaKey
  ) {
    /*
      Touchpad pinch usually gives
      small fractional delta values.
    */

    const delta =
      wheelEvent.deltaY;

    if (
      !Number.isFinite(delta) ||
      delta === 0
    ) {
      return;
    }

    /*
      Smooth touchpad zoom
    */

   zoomFactor =
  Math.exp(
    -delta * 0.005
  );

/* Prevent one wheel event from
   making the canvas jump too far */
zoomFactor = Math.max(
  0.85,
  Math.min(1.15, zoomFactor)
);
  } else {
    /*
      Normal mouse wheel
    */

    const direction =
      wheelEvent.deltaY > 0
        ? -1
        : 1;

    zoomFactor =
      direction > 0
        ? 1.25
        : 1 / 1.25;
  }

  /* =========================
     NEW SCALE
  ========================= */

  let newScale =
    oldScale * zoomFactor;
const MIN_ZOOM =
  0.000001;

const MAX_ZOOM =
  1000000;

newScale =
  Math.max(
    MIN_ZOOM,
    Math.min(
      MAX_ZOOM,
      newScale
    )
  );


  /* =========================
     KEEP POINTER POSITION
  ========================= */

  const worldPoint = {
    x:
      (pointer.x -
        position.x) /
      oldScale,

    y:
      (pointer.y -
        position.y) /
      oldScale,
  };

  const newPosition = {
    x:
      pointer.x -
      worldPoint.x *
        newScale,

    y:
      pointer.y -
      worldPoint.y *
        newScale,
  };

  setScale(
    newScale
  );

  setPosition(
    newPosition
  );
};

    /* =========================
     ZOOM FIT
  ========================= */

  const zoomFit = () => {
   if (objects.length === 0) {
  setScale(1);

  setPosition({
    x:
      (viewportSize.width <= 768
        ? viewportSize.width
        : viewportSize.width - 298) / 2,

    y:
      (viewportSize.width <= 768
        ? viewportSize.height - 87 - 64
        : viewportSize.height - 87) / 2,
  });

  return;
}

    const points = [];

    objects.forEach((object) => {
      if (
        object.type === "line" ||
        object.type === "polyline"
      ) {
        for (
          let i = 0;
          i < object.points.length;
          i += 2
        ) {
          points.push({
            x: object.points[i],
            y: object.points[i + 1],
          });
        }
      }

      if (
        object.type === "circle" ||
        object.type === "arc"
      ) {
        const radius =
          object.radius || 0;

        points.push({
          x: object.x - radius,
          y: object.y - radius,
        });

        points.push({
          x: object.x + radius,
          y: object.y + radius,
        });
      }

      /* =========================
   ELLIPSE — ZOOM FIT
========================= */

if (
  object.type === "ellipse" &&
  Number.isFinite(object.x) &&
  Number.isFinite(object.y)
) {
  const rx = Math.abs(
    Number(object.radiusX) || 0
  );

  const ry = Math.abs(
    Number(object.radiusY) || 0
  );

  const rotation =
    (Number(object.rotation) || 0) *
    (Math.PI / 180);

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const halfWidth = Math.sqrt(
    rx * rx * cos * cos +
    ry * ry * sin * sin
  );

  const halfHeight = Math.sqrt(
    rx * rx * sin * sin +
    ry * ry * cos * cos
  );

  points.push({
    x: object.x - halfWidth,
    y: object.y - halfHeight,
  });

  points.push({
    x: object.x + halfWidth,
    y: object.y + halfHeight,
  });
}

     if (
  object.type === "rectangle" ||
  object.type === "hatch"
) {
  points.push({
    x: object.x,
    y: object.y,
  });

  points.push({
    x:
      object.x +
      object.width,
    y:
      object.y +
      object.height,
  });
}

      if (
        object.type === "text"
      ) {
        const fontSize =
          object.fontSize || 24;

        points.push({
          x: object.x,
          y: object.y,
        });

        points.push({
          x:
            object.x +
            fontSize * 5,
          y:
            object.y +
            fontSize,
        });
      }
    });

    if (points.length === 0)
      return;

    const minX = Math.min(
      ...points.map(
        (point) => point.x
      )
    );

    const maxX = Math.max(
      ...points.map(
        (point) => point.x
      )
    );

    const minY = Math.min(
      ...points.map(
        (point) => point.y
      )
    );

    const maxY = Math.max(
      ...points.map(
        (point) => point.y
      )
    );

    const drawingWidth =
      Math.max(
        100,
        maxX - minX
      );

    const drawingHeight =
      Math.max(
        100,
        maxY - minY
      );

  const canvasWidth =
  viewportSize.width <= 768
    ? viewportSize.width
    : viewportSize.width - 298;

const canvasHeight =
  viewportSize.width <= 768
    ? viewportSize.height - 87 - 64
    : viewportSize.height - 87;

    const padding = 80;

    const scaleX =
      (canvasWidth - padding) /
      drawingWidth;

    const scaleY =
      (canvasHeight - padding) /
      drawingHeight;

  const newScale =
  Math.max(
    MIN_ZOOM,
    Math.min(
      MAX_ZOOM,
      Math.min(
        scaleX,
        scaleY
      )
    )
  );

    const centerX =
      (minX + maxX) / 2;

    const centerY =
      (minY + maxY) / 2;

    setScale(newScale);

    setPosition({
      x:
        canvasWidth / 2 -
        centerX * newScale,

      y:
        canvasHeight / 2 -
        centerY * newScale,
    });
  };

/* =========================
   MOBILE TOUCH CONTROLS
========================= */

const getTouchDistance = (touches) => {
  const dx =
    touches[0].clientX -
    touches[1].clientX;

  const dy =
    touches[0].clientY -
    touches[1].clientY;

  return Math.hypot(dx, dy);
};

const getTouchCenter = (touches) => {
  const centerX =
    (touches[0].clientX +
      touches[1].clientX) / 2;

  const centerY =
    (touches[0].clientY +
      touches[1].clientY) / 2;

  const container =
    stageRef.current?.container();

  const rect =
    container?.getBoundingClientRect();

  return {
    x:
      centerX -
      (rect?.left || 0),

    y:
      centerY -
      (rect?.top || 0),
  };
};
const handleTouchStart = (e) => {
  const touches = e.evt.touches;

  if (!touches) return;

  e.evt.preventDefault();

  /* =========================
     TWO FINGERS — PINCH + PAN
  ========================= */

  if (touches.length === 2) {
    touchStateRef.current = {
      lastDistance: getTouchDistance(touches),
      lastCenter: getTouchCenter(touches),
    };

    setIsPanning(false);
    panStartRef.current = null;

    return;
  }

  /* =========================
     ONE FINGER
  ========================= */

  if (touches.length === 1) {
    lastTouchTimeRef.current = Date.now();

    const stage = e.target.getStage();

    if (!stage) {
      return;
    }

    stage.setPointersPositions(e.evt);

    /* =========================
       SELECT — OBJECT TAP
       OR BLANK CANVAS PAN
    ========================= */

    if (tool === "select") {
      const touch = touches[0];

      const stageNode = e.target.getStage();
      const tappedBlankCanvas = e.target === stageNode;

      /* OBJECT TAP */
      if (!tappedBlankCanvas) {
        setIsPanning(false);
        panStartRef.current = null;

        handleMouseDown(e);

        return;
      }

      /* BLANK CANVAS — START PAN */
      const rect = stage.container().getBoundingClientRect();

      panStartRef.current = {
        mouseX: touch.clientX - rect.left,
        mouseY: touch.clientY - rect.top,
        positionX: position.x,
        positionY: position.y,
      };

      setIsPanning(true);

      return;
    }

/* =========================
   LINE — MOBILE
   TOUCH ONLY MOVES CURSOR
========================= */

if (tool === "line") {
  const stage = e.target.getStage();

  if (!stage) {
    return;
  }

  stage.setPointersPositions(e.evt);

  const pointer = stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  const rawX =
    (pointer.x - position.x) / scale;

  const rawY =
    (pointer.y - position.y) / scale;

  const snappedPoint = snapToObject(
    rawX,
    rawY
  );

  setMousePosition({
    x: snappedPoint.x,
    y: snappedPoint.y,
  });

  setSnapPoint({
    x: snappedPoint.x,
    y: snappedPoint.y,
  });

  return;
}

    /* =========================
       OFFSET — SELECT OBJECT
    ========================= */

    if (tool === "offset") {
      handleMouseDown(e);
      return;
    }

    /* =========================
       MOVE — SELECT OBJECT
    ========================= */

    if (tool === "move") {
      handleMouseDown(e);
      return;
    }

    /* =========================
       OTHER TOOLS
    ========================= */

    handleMouseDown(e);
  }
};

const handleTouchMove = (e) => {
  const touches = e.evt.touches;

  if (!touches) return;

  e.evt.preventDefault();

  /* =========================
     TWO FINGERS
     PINCH ZOOM + PAN
  ========================= */

  if (touches.length === 2) {
  const center =
    getTouchCenter(touches);

  const distance =
    getTouchDistance(touches);

  const oldScale = scale;

  const lastCenter =
    touchStateRef.current.lastCenter;

  const lastDistance =
    touchStateRef.current.lastDistance;

  if (
    !lastCenter ||
    !lastDistance
  ) {
    touchStateRef.current = {
      lastCenter: center,
      lastDistance: distance,
    };

    return;
  }

  const zoomRatio =
    distance / lastDistance;

  const safeZoomRatio = Math.max(
    0.85,
    Math.min(1.15, zoomRatio)
  );

  let newScale =
    oldScale * safeZoomRatio;

  const MIN_ZOOM = 0.001;
  const MAX_ZOOM = 1000000;

  newScale = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, newScale)
  );

  const worldPoint = {
    x:
      (lastCenter.x -
        position.x) /
      oldScale,

    y:
      (lastCenter.y -
        position.y) /
      oldScale,
  };

  const newPosition = {
    x:
      center.x -
      worldPoint.x *
        newScale,

    y:
      center.y -
      worldPoint.y *
        newScale,
  };

  setScale(newScale);
  setPosition(newPosition);

  touchStateRef.current = {
    lastCenter: center,
    lastDistance: distance,
  };

  return;
}

  /* =========================
     ONE FINGER
  ========================= */

  if (touches.length === 1) {

        /* =========================
       UPDATE MOBILE TOUCH POINTER
    ========================= */

    const touchStage = e.target.getStage();

    if (touchStage) {
      touchStage.setPointersPositions(e.evt);
    }

    /* SELECT = PAN */
    if (
      tool === "select" &&
      isPanning &&
      panStartRef.current
    ) {
      const touch = touches[0];

      const stage =
        e.target.getStage();

      if (!stage) return;

      const rect =
        stage
          .container()
          .getBoundingClientRect();

      const currentX =
        touch.clientX -
        rect.left;

      const currentY =
        touch.clientY -
        rect.top;

      const dx =
        currentX -
        panStartRef.current.mouseX;

      const dy =
        currentY -
        panStartRef.current.mouseY;

      setPosition({
        x:
          panStartRef.current.positionX +
          dx,

        y:
          panStartRef.current.positionY +
          dy,
      });

      return;
    }

    /* =========================
   OFFSET = OFFSET OBJECT
========================= */

if (
  tool === "offset"
) {
  handleMouseMove(e);
  return;
}


/* ========================
 MOVE = MOVE OBJECT
 ========================= */

    if (
      tool === "move" &&
      moveStartRef.current
    ) {
      handleMouseMove(e);
      return;
    }

        /* =========================
       COPY = MOVE COPIED OBJECT
    ========================= */

    if (
      tool === "copy" &&
      copyStartRef.current
    ) {
      handleMouseMove(e);
      return;
    }

    /* =========================
   MOBILE LINE PREVIEW
   FINGER MOVE = CURSOR + PREVIEW
========================= */

if (tool === "line") {
  const stage =
    e.target.getStage();

  if (!stage) {
    return;
  }

  stage.setPointersPositions(
    e.evt
  );

  const pointer =
    stage.getPointerPosition();

  if (!pointer) {
    return;
  }

  const rawX =
    (pointer.x - position.x) /
    scale;

  const rawY =
    (pointer.y - position.y) /
    scale;

  const snappedPoint =
    snapToObject(
      rawX,
      rawY
    );

  let previewX =
    snappedPoint.x;

  let previewY =
    snappedPoint.y;

  /* =========================
     ORTHO PREVIEW
  ========================= */

  if (lineStart && orthoEnabled) {
    const orthoPoint =
      applyOrtho(
        lineStart.x,
        lineStart.y,
        previewX,
        previewY
      );

    previewX =
      orthoPoint.x;

    previewY =
      orthoPoint.y;
  }

  /* =========================
     POLAR PREVIEW
  ========================= */

  if (lineStart && polarEnabled) {
    const polarPoint =
      applyPolar(
        lineStart.x,
        lineStart.y,
        previewX,
        previewY
      );

    previewX =
      polarPoint.x;

    previewY =
      polarPoint.y;
  }

  setMousePosition({
    x: previewX,
    y: previewY,
  });

  /* =========================
     LIVE LINE PREVIEW
  ========================= */

  if (lineStart) {
    setLinePreview({
      x1: lineStart.x,
      y1: lineStart.y,
      x2: previewX,
      y2: previewY,
    });

    setPendingLinePoint({
      x: previewX,
      y: previewY,
    });
  }

  return;
}

/* =========================
   OTHER DRAWING TOOLS
========================= */

handleMouseMove(e);

  }
};

const handleTouchEnd = (e) => {
  e.evt.preventDefault();

  const touches =
    e.evt.touches;

  /* =========================
     ONE FINGER REMAINS
     AFTER PINCH
  ========================= */

  if (
    touches &&
    touches.length === 1
  ) {
    touchStateRef.current = {
      lastDistance: null,
      lastCenter: null,
    };

    setIsPanning(false);

    panStartRef.current =
      null;

    return;
  }

  /* =========================
     LINE TOUCH FINISHED
     DO NOT CALL MOUSEUP
  ========================= */

  if (tool === "line") {
    touchStateRef.current = {
      lastDistance: null,
      lastCenter: null,
    };

    setIsPanning(false);

    panStartRef.current =
      null;

    return;
  }

  /* =========================
     TOUCH FINISHED
  ========================= */

  touchStateRef.current = {
    lastDistance: null,
    lastCenter: null,
  };

  setIsPanning(false);

  panStartRef.current =
    null;

  handleMouseUp(e);
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

  const shareDrawing = async () => {
  const drawingData = {
    objects: objects,
    measurements: measurements,
    layers: layers,
    activeLayerId: activeLayerId,
  };

  const json = JSON.stringify(
    drawingData,
    null,
    2
  );

  try {
    if (navigator.share) {
      const file = new File(
        [json],
        "mycad-drawing.json",
        {
          type: "application/json",
        }
      );

      await navigator.share({
        title: "MyCAD Drawing",
        text: "MyCAD drawing file",
        files: [file],
      });

      return;
    }

    window.alert(
      "Sharing is not supported on this device. Use Save."
    );
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(
        "Share failed:",
        error
      );
    }
  }
};

/* =========================
   PLOT TO PDF
========================= */

const plotToPDF = () => {
  const stage = stageRef.current;

  if (!stage) {
    window.alert("Drawing canvas is not ready.");
    return;
  }

  let printWindow = null;

  try {
    const imageData = stage.toDataURL({
      pixelRatio: 2,
    });

    printWindow = window.open("", "_blank");

    if (!printWindow) {
      window.alert(
        "PDF preview blocked hai. Browser mein pop-ups allow karke dobara try karo."
      );
      return;
    }

    const orientation =
      stage.width() >= stage.height()
        ? "landscape"
        : "portrait";

    printWindow.document.open();

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
          <title>MyCAD Plot</title>

          <style>
            @page {
              size: ${orientation};
              margin: 8mm;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: #ffffff;
            }

            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            @media print {
              html,
              body {
                width: 100%;
                height: 100%;
                overflow: hidden;
              }

              img {
                max-width: 100%;
                max-height: 100%;
              }
            }
          </style>
        </head>

        <body>
          <img
            id="plot-image"
            src="${imageData}"
            alt="MyCAD drawing"
          />

          <script>
            const image = document.getElementById("plot-image");

            function printDrawing() {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 350);
            }

            if (image.complete) {
              printDrawing();
            } else {
              image.onload = printDrawing;
            }

            window.onafterprint = () => {
              window.close();
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  } catch (error) {
    console.error("Plot to PDF failed:", error);

    if (printWindow) {
      printWindow.close();
    }

    window.alert("PDF preview open nahi ho paya.");
  }
};

const copyDrawing = async () => {
  const drawingData = {
    objects,
    measurements,
    layers,
    activeLayerId,
  };

  const json = JSON.stringify(
    drawingData,
    null,
    2
  );

  try {
    await navigator.clipboard.writeText(json);
    window.alert("Drawing data copied.");
  } catch (error) {
    window.alert(
      "Copy is not supported on this device."
    );
  }
};

const pasteDrawing = async () => {
  try {
    const json =
      await navigator.clipboard.readText();

    if (
      !json ||
      !json.trim()
    ) {
      window.alert(
        "Clipboard is empty."
      );
      return;
    }

    const drawingData =
      JSON.parse(json);

    if (
      !drawingData.objects ||
      !Array.isArray(
        drawingData.objects
      )
    ) {
      window.alert(
        "Invalid drawing data."
      );
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    const pastedObjects =
      drawingData.objects.map(
        (object) => ({
          ...object,
          locked: false,
          hidden: false,
        })
      );

    const newObjects = [
      ...objects,
      ...pastedObjects,
    ];

    setObjects(
      newObjects
    );

    if (
      Array.isArray(
        drawingData.measurements
      )
    ) {
      setMeasurements(
        (previousMeasurements) => [
          ...previousMeasurements,
          ...drawingData.measurements,
        ]
      );
    }

    const newIndexes =
      pastedObjects.map(
        (_, index) =>
          objects.length + index
      );

    setSelectedIndexes(
      newIndexes
    );

    setSelectedIndex(
      newIndexes.length > 0
        ? newIndexes[
            newIndexes.length - 1
          ]
        : null
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );
  } catch (error) {
    window.alert(
      "Could not paste drawing data."
    );

    console.error(
      "Paste drawing failed:",
      error
    );
  }
};

const cutDrawing = async () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const selectedObjects =
    editableIndexes
      .map(
        (index) =>
          objects[index]
      )
      .filter(Boolean);

  try {
    await navigator.clipboard.writeText(
      JSON.stringify(
        {
          objects:
            selectedObjects,
        },
        null,
        2
      )
    );

    deleteSelected();
  } catch (error) {
    window.alert(
      "Cut is not supported on this device."
    );

    console.error(
      "Cut failed:",
      error
    );
  }
};

const zoomToSelected = () => {
  if (selectedIndex === null || !selectedObject) {
    window.alert("Select an object first.");
    return;
  }

  let centerX = selectedObject.x || 0;
  let centerY = selectedObject.y || 0;

  if (
    selectedObject.type === "line" &&
    Array.isArray(selectedObject.points) &&
    selectedObject.points.length >= 4
  ) {
    centerX =
      (selectedObject.points[0] +
        selectedObject.points[2]) /
      2;

    centerY =
      (selectedObject.points[1] +
        selectedObject.points[3]) /
      2;
  }

  if (
    Array.isArray(selectedObject.points) &&
    selectedObject.points.length >= 2
  ) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (
      let i = 0;
      i < selectedObject.points.length;
      i += 2
    ) {
      minX = Math.min(
        minX,
        selectedObject.points[i]
      );

      maxX = Math.max(
        maxX,
        selectedObject.points[i]
      );

      minY = Math.min(
        minY,
        selectedObject.points[i + 1]
      );

      maxY = Math.max(
        maxY,
        selectedObject.points[i + 1]
      );
    }

    if (
      Number.isFinite(minX) &&
      Number.isFinite(maxX) &&
      Number.isFinite(minY) &&
      Number.isFinite(maxY)
    ) {
      centerX = (minX + maxX) / 2;
      centerY = (minY + maxY) / 2;
    }
  }

  setPosition({
    x:
      window.innerWidth / 2 -
      centerX * scale,
    y:
      (window.innerHeight - 290) / 2 -
      centerY * scale,
  });
};

const duplicateSelected = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    isObjectLocked(
      selectedIndex
    )
  ) {
    window.alert(
      "This object is locked."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const duplicate = {
    ...selectedObject,

    locked: false,
    hidden: false,

    ...(Array.isArray(
      selectedObject.points
    )
      ? {
          points:
            selectedObject.points.map(
              (value) =>
                value + 25
            ),
        }
      : {}),

    ...(selectedObject.x !==
    undefined
      ? {
          x:
            selectedObject.x +
            25,
        }
      : {}),

    ...(selectedObject.y !==
    undefined
      ? {
          y:
            selectedObject.y +
            25,
        }
      : {}),
  };

  const newObjects = [
    ...objects,
    duplicate,
  ];

  setObjects(
    newObjects
  );

  const newIndex =
    newObjects.length - 1;

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );
};

/* =========================
   BRING TO FRONT
========================= */

const bringToFront = () => {
  if (
    selectedIndex === null ||
    selectedIndex === undefined
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    selectedIndex < 0 ||
    selectedIndex >= objects.length
  ) {
    return;
  }

  if (
    isObjectLocked(selectedIndex)
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  if (
    selectedIndex ===
    objects.length - 1
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const selectedObject =
    objects[selectedIndex];

  const newObjects =
    objects.filter(
      (_, index) =>
        index !== selectedIndex
    );

  newObjects.push(
    selectedObject
  );

  const newIndex =
    newObjects.length - 1;

  setObjects(
    newObjects
  );

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};


/* =========================
   SEND TO BACK
========================= */

const sendToBack = () => {
  if (
    selectedIndex === null ||
    selectedIndex === undefined
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    selectedIndex < 0 ||
    selectedIndex >= objects.length
  ) {
    return;
  }

  if (
    isObjectLocked(selectedIndex)
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  if (
    selectedIndex === 0
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const selectedObject =
    objects[selectedIndex];

  const newObjects =
    objects.filter(
      (_, index) =>
        index !== selectedIndex
    );

  newObjects.unshift(
    selectedObject
  );

  setObjects(
    newObjects
  );

  setSelectedIndex(0);

  setSelectedIndexes([
    0,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};


/* =========================
   BRING FORWARD
========================= */

const bringForward = () => {
  if (
    selectedIndex === null ||
    selectedIndex === undefined
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    selectedIndex < 0 ||
    selectedIndex >= objects.length - 1
  ) {
    return;
  }

  if (
    isObjectLocked(selectedIndex)
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const newObjects = [
    ...objects,
  ];

  const temp =
    newObjects[
      selectedIndex
    ];

  newObjects[
    selectedIndex
  ] =
    newObjects[
      selectedIndex + 1
    ];

  newObjects[
    selectedIndex + 1
  ] = temp;

  const newIndex =
    selectedIndex + 1;

  setObjects(
    newObjects
  );

  setSelectedIndex(
    newIndex
  );

  setSelectedIndexes([
    newIndex,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};


/* =========================
   REVERSE SELECTED DIRECTION
========================= */

const reverseSelectedDirection = () => {
  if (
    selectedIndex === null ||
    selectedIndex === undefined ||
    !selectedObject
  ) {
    window.alert(
      "Select a line or polyline first."
    );
    return;
  }

  if (
    selectedObject.type !== "line" &&
    selectedObject.type !== "polyline"
  ) {
    window.alert(
      "Reverse Direction supports Line and Polyline only."
    );
    return;
  }

  if (
    isObjectLocked(selectedIndex)
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const reversedObject = {
    ...selectedObject,
  };

  if (
    Array.isArray(
      selectedObject.points
    ) &&
    selectedObject.points.length >= 2
  ) {
    const reversedPoints = [];

    for (
      let i =
        selectedObject.points.length - 2;
      i >= 0;
      i -= 2
    ) {
      reversedPoints.push(
        selectedObject.points[i],
        selectedObject.points[i + 1]
      );
    }

    reversedObject.points =
      reversedPoints;
  }

  const updatedObjects =
    objects.map(
      (
        object,
        index
      ) =>
        index === selectedIndex
          ? reversedObject
          : object
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setSelectedIndex(
    selectedIndex
  );

  setSelectedIndexes([
    selectedIndex,
  ]);

  setFuture([]);
};

/* =========================
   CLEAR CURRENT LAYER
========================= */

const clearCurrentLayer = () => {
  const layerObjects =
    objects.filter(
      (object) =>
        (
          object?.layerId ||
          "layer-0"
        ) === activeLayerId
    );

  if (
    layerObjects.length === 0
  ) {
    window.alert(
      "Current layer has no objects."
    );
    return;
  }

  /* =========================
     CHECK CURRENT LAYER LOCK
  ========================= */

  if (
    isLayerLocked(
      activeLayerId
    )
  ) {
    window.alert(
      "Current layer is locked."
    );
    return;
  }

  const editableObjects =
    layerObjects.filter(
      (object) =>
        !object?.locked
    );

  if (
    editableObjects.length === 0
  ) {
    window.alert(
      "All objects in the current layer are locked."
    );
    return;
  }

  const confirmDelete =
    window.confirm(
      "Delete all unlocked objects from the current layer?"
    );

  if (!confirmDelete) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.filter(
      (object) => {
        const sameLayer =
          (
            object?.layerId ||
            "layer-0"
          ) === activeLayerId;

        if (!sameLayer) {
          return true;
        }

        return Boolean(
          object?.locked
        );
      }
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    null
  );

  setSelectedIndexes([]);

  setSelectedMeasurementIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};


/* =========================
   RESET VIEW
========================= */

const resetView = () => {
  setScale(1);

  setPosition({
    x:
      (viewportSize.width <= 768
        ? viewportSize.width
        : viewportSize.width - 298) / 2,

    y:
      (viewportSize.width <= 768
        ? viewportSize.height - 87 - 64
        : viewportSize.height - 87) / 2,
  });
};


/* =========================
   ROTATE SELECTED 90
========================= */

const rotateSelected90 = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    isObjectLocked(
      selectedIndex
    )
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const currentRotation =
    Number(
      selectedObject.rotation || 0
    );

  const newRotation =
    currentRotation + 90;

  updateSelectedObject(
    "rotation",
    newRotation
  );
};


/* =========================
   RESET SELECTED ROTATION
========================= */

const resetSelectedRotation = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    isObjectLocked(
      selectedIndex
    )
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  updateSelectedObject(
    "rotation",
    0
  );
};


/* =========================
   INCREASE SELECTED TEXT SIZE
========================= */

const increaseSelectedTextSize = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select a text object first."
    );
    return;
  }

  if (
    selectedObject.type !== "text"
  ) {
    window.alert(
      "This works only with text objects."
    );
    return;
  }

  if (
    isObjectLocked(
      selectedIndex
    )
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const currentSize =
    Number(
      selectedObject.fontSize || 24
    );

  const newSize =
    Math.min(
      currentSize + 2,
      200
    );

  updateSelectedObject(
    "fontSize",
    newSize
  );
};


/* =========================
   DECREASE SELECTED TEXT SIZE
========================= */

const decreaseSelectedTextSize = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select a text object first."
    );
    return;
  }

  if (
    selectedObject.type !== "text"
  ) {
    window.alert(
      "This works only with text objects."
    );
    return;
  }

  if (
    isObjectLocked(
      selectedIndex
    )
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const currentSize =
    Number(
      selectedObject.fontSize || 24
    );

  const newSize =
    Math.max(
      currentSize - 2,
      6
    );

  updateSelectedObject(
    "fontSize",
    newSize
  );
};


/* =========================
   RESET SELECTED TEXT SIZE
========================= */

const resetSelectedTextSize = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select a text object first."
    );
    return;
  }

  if (
    selectedObject.type !== "text"
  ) {
    window.alert(
      "This works only with text objects."
    );
    return;
  }

  if (
    isObjectLocked(
      selectedIndex
    )
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  updateSelectedObject(
    "fontSize",
    24
  );
};


/* =========================
   INCREASE SELECTED LINE WIDTH
========================= */

const increaseSelectedLineWidth = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    isObjectLocked(
      selectedIndex
    )
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const currentWidth =
    Number(
      selectedObject.strokeWidth || 2
    );

  const newWidth =
    Math.min(
      currentWidth + 1,
      20
    );

  updateSelectedObject(
    "strokeWidth",
    newWidth
  );
};


/* =========================
   DECREASE SELECTED LINE WIDTH
========================= */

const decreaseSelectedLineWidth = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    isObjectLocked(
      selectedIndex
    )
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const currentWidth =
    Number(
      selectedObject.strokeWidth || 2
    );

  const newWidth =
    Math.max(
      currentWidth - 1,
      1
    );

  updateSelectedObject(
    "strokeWidth",
    newWidth
  );
};

/* =========================
   SELECT ALL LINES
========================= */

const selectAllLines = () => {
  const indexes = objects
    .map((object, index) => {
      if (
        object?.hidden
      ) {
        return null;
      }

      return object?.type === "line"
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};

/* =========================
   SELECT ALL CIRCLES
========================= */

const selectAllCircles = () => {
  const indexes = objects
    .map((object, index) => {
      if (
        object?.hidden
      ) {
        return null;
      }

      return object?.type === "circle"
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   SELECT ALL RECTANGLES
========================= */

const selectAllRectangles = () => {
  const indexes = objects
    .map((object, index) => {
      if (
        object?.hidden
      ) {
        return null;
      }

      return object?.type === "rectangle"
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   SELECT ALL TEXT
========================= */

const selectAllText = () => {
  const indexes = objects
    .map((object, index) => {
      if (
        object?.hidden
      ) {
        return null;
      }

      return object?.type === "text"
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};

/* =========================
   SELECT ALL POLYLINES
========================= */

const selectAllPolylines = () => {
  const indexes = objects
    .map((object, index) => {
      if (
        object?.hidden
      ) {
        return null;
      }

      return object?.type === "polyline"
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   SELECT ALL ARCS
========================= */

const selectAllArcs = () => {
  const indexes = objects
    .map((object, index) => {
      if (
        object?.hidden
      ) {
        return null;
      }

      return object?.type === "arc"
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   SELECT ALL DIMENSIONS
========================= */

const selectAllDimensions = () => {
  const dimensionTypes = [
    "dimension",
    "angularDimension",
    "radiusDimension",
    "diameterDimension",
  ];

  const indexes = objects
    .map((object, index) => {
      if (
        object?.hidden
      ) {
        return null;
      }

      return dimensionTypes.includes(
        object?.type
      )
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   SELECT ALL VISIBLE OBJECTS
========================= */

const selectAllVisible = () => {
  const visibleLayerIds =
    new Set(
      layers
        .filter(
          (layer) => layer.visible
        )
        .map(
          (layer) => layer.id
        )
    );

  const indexes = objects
    .map((object, index) => {
      /* HIDDEN OBJECTS ARE NOT VISIBLE */
      if (
        object?.hidden
      ) {
        return null;
      }

      const layerId =
        object?.layerId ||
        "layer-0";

      return visibleLayerIds.has(
        layerId
      )
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   HIDE SELECTED OBJECTS
========================= */

const hideSelectedObject = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        indexSet.has(index)
          ? {
              ...object,
              hidden: true,
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

  setSelectedIndex(null);
  setSelectedIndexes([]);
};

/* =========================
   SHOW ALL HIDDEN OBJECTS
========================= */

const showAllHiddenObjects = () => {
  const hiddenIndexes = objects
    .map((object, index) =>
      object?.hidden
        ? index
        : null
    )
    .filter(
      (index) =>
        index !== null
    );

  if (
    hiddenIndexes.length === 0
  ) {
    window.alert(
      "No hidden objects found."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const hiddenSet =
    new Set(
      hiddenIndexes
    );

  const updatedObjects =
    objects.map(
      (object, index) =>
        hiddenSet.has(index)
          ? {
              ...object,
              hidden: false,
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
   TOGGLE OBJECT VISIBILITY
========================= */

const toggleSelectedVisibility = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked
    );

  if (editableIndexes.length === 0) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const editableSet =
    new Set(editableIndexes);

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) => {
        if (
          !editableSet.has(index)
        ) {
          return object;
        }

        return {
          ...object,
          hidden:
            !object.hidden,
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
   NUDGE SELECTED OBJECTS
========================= */

const nudgeSelectedObjects = (
  deltaX,
  deltaY
) => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked
    );

  if (editableIndexes.length === 0) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const editableSet =
    new Set(editableIndexes);

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) => {
        if (
          !editableSet.has(index)
        ) {
          return object;
        }

        /* LINE / POLYLINE */
        if (
          Array.isArray(
            object.points
          )
        ) {
          return {
            ...object,
            points:
              object.points.map(
                (value, pointIndex) =>
                  pointIndex % 2 === 0
                    ? value + deltaX
                    : value + deltaY
              ),
          };
        }

        /* CIRCLE / ARC / RECTANGLE / TEXT */
        return {
          ...object,

          ...(Number.isFinite(
            object.x
          )
            ? {
                x:
                  object.x +
                  deltaX,
              }
            : {}),

          ...(Number.isFinite(
            object.y
          )
            ? {
                y:
                  object.y +
                  deltaY,
              }
            : {}),
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
   NUDGE LEFT
========================= */

const nudgeSelectedLeft = () => {
  nudgeSelectedObjects(
    -5,
    0
  );
};


/* =========================
   NUDGE RIGHT
========================= */

const nudgeSelectedRight = () => {
  nudgeSelectedObjects(
    5,
    0
  );
};


/* =========================
   NUDGE UP
========================= */

const nudgeSelectedUp = () => {
  nudgeSelectedObjects(
    0,
    -5
  );
};


/* =========================
   NUDGE DOWN
========================= */

const nudgeSelectedDown = () => {
  nudgeSelectedObjects(
    0,
    5
  );
};


/* =========================
   FIT ALL OBJECTS
========================= */

const fitAllObjects = () => {
  if (
    objects.length === 0
  ) {
    zoomFit();
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  objects.forEach(
    (object) => {
      if (
        Array.isArray(
          object.points
        )
      ) {
        for (
          let i = 0;
          i < object.points.length;
          i += 2
        ) {
          const x =
            object.points[i];

          const y =
            object.points[
              i + 1
            ];

          minX =
            Math.min(
              minX,
              x
            );

          maxX =
            Math.max(
              maxX,
              x
            );

          minY =
            Math.min(
              minY,
              y
            );

          maxY =
            Math.max(
              maxY,
              y
            );
        }
      }

      if (
        object.x !== undefined &&
        object.y !== undefined
      ) {
        const radius =
          object.radius || 0;

        minX =
          Math.min(
            minX,
            object.x - radius
          );

        maxX =
          Math.max(
            maxX,
            object.x + radius
          );

        minY =
          Math.min(
            minY,
            object.y - radius
          );

        maxY =
          Math.max(
            maxY,
            object.y + radius
          );
      }
    }
  );

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    zoomFit();
    return;
  }

  const centerX =
    (minX + maxX) / 2;

  const centerY =
    (minY + maxY) / 2;

  setPosition({
    x:
      (
        viewportSize.width <= 768
          ? viewportSize.width
          : viewportSize.width - 298
      ) / 2 -
      centerX * scale,

    y:
      (
        viewportSize.width <= 768
          ? viewportSize.height - 87 - 64
          : viewportSize.height - 87
      ) / 2 -
      centerY * scale,
  });
};


/* =========================
   TOGGLE GRID
========================= */

const toggleGrid = () => {
  setGridEnabled(
    (previous) => !previous
  );
};


/* =========================
   TOGGLE OSNAP
========================= */

const toggleOSNAP = () => {
  setObjectSnapEnabled(
    (previous) =>
      !previous
  );
};


/* =========================
   TOGGLE ORTHO
========================= */

const toggleOrtho = () => {
  if (orthoEnabled) {
    setOrthoEnabled(false);
    return;
  }

  setOrthoEnabled(true);
  setPolarEnabled(false);
};


/* =========================
   TOGGLE POLAR
========================= */

const togglePolar = () => {
  if (polarEnabled) {
    setPolarEnabled(false);
    return;
  }

  const input = window.prompt(
    "Enter Polar Angle Step:",
    String(polarAngleStep)
  );

  if (input === null) {
    return;
  }

  const angle = Number(input);

  if (
    !Number.isFinite(angle) ||
    angle <= 0 ||
    angle > 180
  ) {
    window.alert(
      "Enter an angle between 1 and 180 degrees."
    );
    return;
  }

  setPolarAngleStep(angle);
  setPolarEnabled(true);
  setOrthoEnabled(false);
};

/* =========================
   SELECT NEXT OBJECT
========================= */

const selectNextObject = () => {
  if (objects.length === 0) {
    window.alert("No objects available.");
    return;
  }

  const nextIndex =
    selectedIndex === null
      ? 0
      : (selectedIndex + 1) % objects.length;

  setSelectedIndex(nextIndex);
  setSelectedIndexes([nextIndex]);
};


/* =========================
   SELECT PREVIOUS OBJECT
========================= */

const selectPreviousObject = () => {
  if (objects.length === 0) {
    window.alert("No objects available.");
    return;
  }

  const previousIndex =
    selectedIndex === null
      ? objects.length - 1
      : (selectedIndex - 1 + objects.length) %
        objects.length;

  setSelectedIndex(previousIndex);
  setSelectedIndexes([previousIndex]);
};


/* =========================
   DESELECT ALL
========================= */

const deselectAllObjects = () => {
  setSelectedIndex(null);
  setSelectedIndexes([]);
  setSelectedMeasurementIndex(null);
  setCommandFirstIndex(null);
};


/* =========================
   ZOOM TO ALL SELECTED
========================= */


const zoomToAllSelected = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const selectedObjects =
    indexes
      .map(
        (index) =>
          objects[index]
      )
      .filter(Boolean);

  const points = [];

  selectedObjects.forEach(
    (object) => {

      /* LINE / POLYLINE */
      if (
        Array.isArray(
          object.points
        )
      ) {
        for (
          let i = 0;
          i <
          object.points.length;
          i += 2
        ) {
          points.push({
            x: object.points[i],
            y:
              object.points[i + 1],
          });
        }
      }

      /* CIRCLE / ARC */
      if (
        Number.isFinite(object.x) &&
        Number.isFinite(object.y)
      ) {
        const radius =
          Number(
            object.radius
          ) || 0;

        points.push({
          x:
            object.x - radius,
          y:
            object.y - radius,
        });

        points.push({
          x:
            object.x + radius,
          y:
            object.y + radius,
        });
      }

      /* RECTANGLE / HATCH */
      if (
        (
          object.type ===
            "rectangle" ||
          object.type ===
            "hatch"
        ) &&
        Number.isFinite(object.x) &&
        Number.isFinite(object.y)
      ) {
        const width =
          Number(
            object.width
          ) || 0;

        const height =
          Number(
            object.height
          ) || 0;

        points.push({
          x: Math.min(
            object.x,
            object.x + width
          ),
          y: Math.min(
            object.y,
            object.y + height
          ),
        });

        points.push({
          x: Math.max(
            object.x,
            object.x + width
          ),
          y: Math.max(
            object.y,
            object.y + height
          ),
        });
      }

      /* TEXT */
      if (
        object.type === "text"
      ) {
        const fontSize =
          Number(
            object.fontSize
          ) || 24;

        points.push({
          x: object.x || 0,
          y: object.y || 0,
        });

        points.push({
          x:
            (object.x || 0) +
            fontSize * 5,
          y:
            (object.y || 0) +
            fontSize,
        });
      }
    }
  );

  if (points.length === 0) {
    window.alert(
      "Selected object has no valid bounds."
    );
    return;
  }

  const minX = Math.min(
    ...points.map(
      (point) => point.x
    )
  );

  const maxX = Math.max(
    ...points.map(
      (point) => point.x
    )
  );

  const minY = Math.min(
    ...points.map(
      (point) => point.y
    )
  );

  const maxY = Math.max(
    ...points.map(
      (point) => point.y
    )
  );

  const drawingWidth =
    Math.max(
      100,
      maxX - minX
    );

  const drawingHeight =
    Math.max(
      100,
      maxY - minY
    );

 const canvasWidth =
  viewportSize.width <= 768
    ? viewportSize.width
    : viewportSize.width - 298;

const canvasHeight =
  viewportSize.width <= 768
    ? viewportSize.height - 87 - 64
    : viewportSize.height - 87;

  const padding = 100;

  const scaleX =
    (canvasWidth - padding) /
    drawingWidth;

  const scaleY =
    (canvasHeight - padding) /
    drawingHeight;

  const newScale =
   Math.max(
  0.000001,
  Math.min(
    1000000,
    Math.min(scaleX, scaleY)
  )
);
    

  const centerX =
    (minX + maxX) / 2;

  const centerY =
    (minY + maxY) / 2;

  setScale(
    newScale
  );

  setPosition({
    x:
      canvasWidth / 2 -
      centerX * newScale,

    y:
      canvasHeight / 2 -
      centerY * newScale,
  });
};

/* =========================
   TOGGLE LOCK
========================= */

const toggleSelectedLock = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert("Select an object first.");
    return;
  }

  const previousObjects = [...objects];

  const updatedObjects = objects.map(
    (object, index) =>
      index === selectedIndex
        ? {
            ...object,
            locked: !object.locked,
          }
        : object
  );

  setObjects(updatedObjects);

  saveHistory(
    previousObjects,
    [...measurements]
  );
};


/* =========================
   LOCK ALL SELECTED
========================= */

const lockAllSelected = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert("Select at least one object.");
    return;
  }

  const selectedSet = new Set(indexes);
  const previousObjects = [...objects];

  const updatedObjects = objects.map(
    (object, index) =>
      selectedSet.has(index)
        ? {
            ...object,
            locked: true,
          }
        : object
  );

  setObjects(updatedObjects);

  saveHistory(
    previousObjects,
    [...measurements]
  );
};


/* =========================
   UNLOCK ALL OBJECTS
========================= */

const unlockAllObjects = () => {
  const previousObjects = [...objects];

  const updatedObjects = objects.map(
    (object) => ({
      ...object,
      locked: false,
    })
  );

  setObjects(updatedObjects);

  saveHistory(
    previousObjects,
    [...measurements]
  );
};


/* =========================
   DELETE SELECTED ONLY
========================= */

const deleteSelectedOnly = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const deletableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked
    );

  if (
    deletableIndexes.length === 0
  ) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      deletableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.filter(
      (_, index) =>
        !indexSet.has(index)
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);
  setSelectedMeasurementIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};

/* =========================
   ROTATE -90°
========================= */

const rotateSelectedMinus90 = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }
  if (isObjectLocked(selectedIndex)) {
  window.alert(
    "This object is locked."
  );
  return;
}

  const currentRotation =
    Number(
      selectedObject.rotation || 0
    );

  updateSelectedObject(
    "rotation",
    currentRotation - 90
  );
};


/* =========================
   ROTATE 180°
========================= */

const rotateSelected180 = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }
  if (isObjectLocked(selectedIndex)) {
  window.alert(
    "This object is locked."
  );
  return;
}

  const currentRotation =
    Number(
      selectedObject.rotation || 0
    );

  updateSelectedObject(
    "rotation",
    currentRotation + 180
  );
};


/* =========================
   ROTATE 45°
========================= */

const rotateSelected45 = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }
  if (isObjectLocked(selectedIndex)) {
  window.alert(
    "This object is locked."
  );
  return;
}

  const currentRotation =
    Number(
      selectedObject.rotation || 0
    );

  updateSelectedObject(
    "rotation",
    currentRotation + 45
  );
};

/* =========================
   SET EXACT ROTATION
========================= */

const setExactRotation = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  if (
    isObjectLocked(selectedIndex)
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const currentRotation =
    Number(
      selectedObject.rotation || 0
    );

  const input =
    window.prompt(
      "Enter rotation angle:",
      String(currentRotation)
    );

  if (input === null) {
    return;
  }

  const angle =
    Number(
      input.trim()
    );

  if (
    !Number.isFinite(angle)
  ) {
    window.alert(
      "Please enter a valid angle."
    );
    return;
  }

  updateSelectedObject(
    "rotation",
    angle
  );
};


/* =========================
   HIDE ALL SELECTED
========================= */

const hideAllSelected = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked &&
        !isLayerLocked(
          objects[index].layerId ||
            "layer-0"
        )
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        indexSet.has(index)
          ? {
              ...object,
              hidden: true,
            }
          : object
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};


/* =========================
   SHOW SELECTED OBJECTS
========================= */

const showSelectedObjects = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked &&
        !isLayerLocked(
          objects[index].layerId ||
            "layer-0"
        )
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        indexSet.has(index)
          ? {
              ...object,
              hidden: false,
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

  setFuture([]);
};


/* =========================
   LOCK SELECTED OBJECTS
========================= */

const lockSelectedObjects = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked &&
        !isLayerLocked(
          objects[index].layerId ||
            "layer-0"
        )
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        indexSet.has(index)
          ? {
              ...object,
              locked: true,
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

  setFuture([]);
};


/* =========================
   UNLOCK SELECTED OBJECTS
========================= */

const unlockSelectedObjects = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const lockedIndexes =
    indexes.filter(
      (index) =>
        objects[index]?.locked
    );

  if (
    lockedIndexes.length === 0
  ) {
    window.alert(
      "No locked selected objects found."
    );
    return;
  }

  const lockedSet =
    new Set(
      lockedIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        lockedSet.has(index)
          ? {
              ...object,
              locked: false,
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

  setFuture([]);
};
/* =========================
   FLIP HORIZONTAL
========================= */

const flipSelectedHorizontal = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked &&
        !isLayerLocked(
          objects[index].layerId ||
            "layer-0"
        )
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) => {
        if (
          !indexSet.has(index)
        ) {
          return object;
        }

        /* =========================
           POINT-BASED OBJECTS
        ========================= */

        if (
          Array.isArray(
            object.points
          ) &&
          object.points.length >= 2
        ) {
          let minX = Infinity;
          let maxX = -Infinity;

          for (
            let i = 0;
            i < object.points.length;
            i += 2
          ) {
            minX = Math.min(
              minX,
              object.points[i]
            );

            maxX = Math.max(
              maxX,
              object.points[i]
            );
          }

          const centerX =
            (minX + maxX) / 2;

          const newPoints = [];

          for (
            let i = 0;
            i < object.points.length;
            i += 2
          ) {
            const x =
              object.points[i];

            const y =
              object.points[i + 1];

            newPoints.push(
              centerX -
                (x - centerX),
              y
            );
          }

          return {
            ...object,
            points:
              newPoints,
          };
        }

        /* =========================
           X-BASED OBJECTS
        ========================= */

        if (
          Number.isFinite(
            object.x
          )
        ) {
          return {
            ...object,
            scaleX:
              -(
                object.scaleX || 1
              ),
          };
        }

        return object;
      }
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};


/* =========================
   FLIP VERTICAL
========================= */

const flipSelectedVertical = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked &&
        !isLayerLocked(
          objects[index].layerId ||
            "layer-0"
        )
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) => {
        if (
          !indexSet.has(index)
        ) {
          return object;
        }

        /* =========================
           POINT-BASED OBJECTS
        ========================= */

        if (
          Array.isArray(
            object.points
          ) &&
          object.points.length >= 2
        ) {
          let minY = Infinity;
          let maxY = -Infinity;

          for (
            let i = 1;
            i < object.points.length;
            i += 2
          ) {
            minY = Math.min(
              minY,
              object.points[i]
            );

            maxY = Math.max(
              maxY,
              object.points[i]
            );
          }

          const centerY =
            (minY + maxY) / 2;

          const newPoints = [];

          for (
            let i = 0;
            i < object.points.length;
            i += 2
          ) {
            const x =
              object.points[i];

            const y =
              object.points[i + 1];

            newPoints.push(
              x,
              centerY -
                (y - centerY)
            );
          }

          return {
            ...object,
            points:
              newPoints,
          };
        }

        /* =========================
           Y-BASED OBJECTS
        ========================= */

        if (
          Number.isFinite(
            object.y
          )
        ) {
          return {
            ...object,
            scaleY:
              -(
                object.scaleY || 1
              ),
          };
        }

        return object;
      }
    );

  setObjects(
    updatedObjects
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};

/* =========================
   DUPLICATE ALL SELECTED
========================= */

const duplicateAllSelected = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) => {
        const object =
          objects[index];

        if (!object) {
          return false;
        }

        /* OBJECT LOCK */
        if (
          object.locked
        ) {
          return false;
        }

        /* LAYER LOCK */
        const objectLayerId =
          object.layerId ||
          "layer-0";

        if (
          isLayerLocked(
            objectLayerId
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const selectedObjects =
    editableIndexes
      .map(
        (index) =>
          objects[index]
      )
      .filter(Boolean);

  const duplicates =
    selectedObjects.map(
      (object) => {
        const duplicate = {
          ...object,
          locked: false,
          hidden: false,
        };

        /* =========================
           POINTS
        ========================= */

        if (
          Array.isArray(
            object.points
          )
        ) {
          duplicate.points =
            object.points.map(
              (value) =>
                value + 25
            );
        }

        /* =========================
           X POSITION
        ========================= */

        if (
          Number.isFinite(
            object.x
          )
        ) {
          duplicate.x =
            object.x + 25;
        }

        /* =========================
           Y POSITION
        ========================= */

        if (
          Number.isFinite(
            object.y
          )
        ) {
          duplicate.y =
            object.y + 25;
        }

        return duplicate;
      }
    );

  const previousObjects = [
    ...objects,
  ];

  setObjects(
    (previousObjects) => {
      const newObjects = [
        ...previousObjects,
        ...duplicates,
      ];

      const startIndex =
        previousObjects.length;

      const newIndexes =
        duplicates.map(
          (_, index) =>
            startIndex + index
        );

      setSelectedIndexes(
        newIndexes
      );

      setSelectedIndex(
        newIndexes.length > 0
          ? newIndexes[
              newIndexes.length - 1
            ]
          : null
      );

      return newObjects;
    }
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};


/* =========================
   DUPLICATE WITH OFFSET
========================= */

const duplicateWithOffset = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (
    indexes.length === 0
  ) {
    window.alert(
      "Select at least one object."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) => {
        const object =
          objects[index];

        if (!object) {
          return false;
        }

        /* OBJECT LOCK */
        if (
          object.locked
        ) {
          return false;
        }

        /* LAYER LOCK */
        const objectLayerId =
          object.layerId ||
          "layer-0";

        if (
          isLayerLocked(
            objectLayerId
          )
        ) {
          return false;
        }

        return true;
      }
    );

  if (
    editableIndexes.length === 0
  ) {
    window.alert(
      "Selected object or its layer is locked."
    );
    return;
  }

  const input =
    window.prompt(
      "Enter duplicate offset:",
      "25"
    );

  if (
    input === null
  ) {
    return;
  }

  const offset =
    Number(
      input.trim()
    );

  if (
    !Number.isFinite(
      offset
    ) ||
    offset <= 0
  ) {
    window.alert(
      "Enter a valid positive offset."
    );
    return;
  }

  const selectedObjects =
    editableIndexes
      .map(
        (index) =>
          objects[index]
      )
      .filter(Boolean);

  const duplicates =
    selectedObjects.map(
      (object) => {
        const duplicate = {
          ...object,
          locked: false,
          hidden: false,
        };

        /* =========================
           POINTS
        ========================= */

        if (
          Array.isArray(
            object.points
          )
        ) {
          duplicate.points =
            object.points.map(
              (value) =>
                value + offset
            );
        }

        /* =========================
           X POSITION
        ========================= */

        if (
          Number.isFinite(
            object.x
          )
        ) {
          duplicate.x =
            object.x + offset;
        }

        /* =========================
           Y POSITION
        ========================= */

        if (
          Number.isFinite(
            object.y
          )
        ) {
          duplicate.y =
            object.y + offset;
        }

        return duplicate;
      }
    );

  const previousObjects = [
    ...objects,
  ];

  const newObjects = [
    ...objects,
    ...duplicates,
  ];

  const startIndex =
    objects.length;

  const newIndexes =
    duplicates.map(
      (_, index) =>
        startIndex + index
    );

  setObjects(
    newObjects
  );

  setSelectedIndexes(
    newIndexes
  );

  setSelectedIndex(
    newIndexes.length > 0
      ? newIndexes[
          newIndexes.length - 1
        ]
      : null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};

/* =========================
   REMOVE LOCK FROM ALL
========================= */

const unlockEveryObject = () => {
  const lockedIndexes = objects
    .map((object, index) =>
      object?.locked
        ? index
        : null
    )
    .filter(
      (index) =>
        index !== null
    );

  if (lockedIndexes.length === 0) {
    window.alert(
      "No locked objects found."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const lockedSet =
    new Set(lockedIndexes);

  const updatedObjects =
    objects.map(
      (object, index) =>
        lockedSet.has(index)
          ? {
              ...object,
              locked: false,
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

  setFuture([]);
};


/* =========================
   REMOVE HIDDEN FLAG
========================= */

const showEverything = () => {
  const hiddenIndexes = objects
    .map((object, index) =>
      object?.hidden
        ? index
        : null
    )
    .filter(
      (index) =>
        index !== null
    );

  if (hiddenIndexes.length === 0) {
    window.alert(
      "No hidden objects found."
    );
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const hiddenSet =
    new Set(hiddenIndexes);

  const updatedObjects =
    objects.map(
      (object, index) =>
        hiddenSet.has(index)
          ? {
              ...object,
              hidden: false,
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

  setFuture([]);
};

/* =========================
   SELECT LOCKED OBJECTS
========================= */

const selectLockedObjects = () => {
  const indexes = objects
    .map((object, index) =>
      object?.locked
        ? index
        : null
    )
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   SELECT HIDDEN OBJECTS
========================= */

const selectHiddenObjects = () => {
  const indexes = objects
    .map((object, index) =>
      object?.hidden
        ? index
        : null
    )
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};

/* =========================
   SELECT UNLOCKED OBJECTS
========================= */

const selectUnlockedObjects = () => {
  const indexes = objects
    .map((object, index) => {
      if (object?.hidden) {
        return null;
      }

      return !object?.locked
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   SELECT OBJECTS WITHOUT LAYER
========================= */

const selectObjectsWithoutLayer = () => {
  const indexes = objects
    .map((object, index) => {
      if (object?.hidden) {
        return null;
      }

      return !object?.layerId
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};


/* =========================
   RESET SELECTED COLOR
========================= */

const resetSelectedColor = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked
    );

  if (editableIndexes.length === 0) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        indexSet.has(index)
          ? {
              ...object,
              color: "#ffffff",
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
   RESET SELECTED WIDTH
========================= */

const resetSelectedWidth = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked
    );

  if (editableIndexes.length === 0) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const indexSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) =>
        indexSet.has(index)
          ? {
              ...object,
              strokeWidth: 2,
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
   RESET SELECTED OBJECT
========================= */

const resetSelectedObject = () => {
  const indexes =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
        ? [selectedIndex]
        : [];

  if (indexes.length === 0) {
    window.alert(
      "Select an object first."
    );
    return;
  }

  const editableIndexes =
    indexes.filter(
      (index) =>
        objects[index] &&
        !objects[index].locked
    );

  if (editableIndexes.length === 0) {
    window.alert(
      "Selected object is locked."
    );
    return;
  }

  const editableSet =
    new Set(
      editableIndexes
    );

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (object, index) => {
        if (
          !editableSet.has(index)
        ) {
          return object;
        }

        return {
          ...object,
          color: "#ffffff",
          strokeWidth: 2,
          rotation: 0,
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

const isObjectLocked = (index) => {
  if (
    index === null ||
    index === undefined
  ) {
    return false;
  }

  const object =
    objects[index];

  if (!object) {
    return false;
  }

  /* OBJECT LOCK */
  if (object.locked) {
    return true;
  }

  /* LAYER LOCK */
  const objectLayerId =
    object.layerId ||
    "layer-0";

  const layerLocked =
    layers.find(
      (layer) =>
        layer.id === objectLayerId
    )?.locked;

  return Boolean(
    layerLocked
  );
};

/* =========================
   DELETE ALL HIDDEN OBJECTS
========================= */

const deleteAllHiddenObjects = () => {
  const hiddenIndexes = objects
    .map((object, index) =>
      object?.hidden
        ? index
        : null
    )
    .filter(
      (index) =>
        index !== null
    );

  if (
    hiddenIndexes.length === 0
  ) {
    window.alert(
      "No hidden objects found."
    );
    return;
  }

  const deletableIndexes =
    hiddenIndexes.filter(
      (index) =>
        objects[index] &&
        !isObjectLocked(index)
    );

  if (
    deletableIndexes.length === 0
  ) {
    window.alert(
      "All hidden objects are locked."
    );
    return;
  }

  const confirmDelete =
    window.confirm(
      `Delete ${deletableIndexes.length} unlocked hidden object(s)?`
    );

  if (!confirmDelete) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const deleteSet =
    new Set(
      deletableIndexes
    );

  const updatedObjects =
    objects.filter(
      (_, index) =>
        !deleteSet.has(index)
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(null);
  setSelectedIndexes([]);

  setSelectedMeasurementIndex(
    null
  );

  saveHistory(
    previousObjects,
    [...measurements]
  );

  setFuture([]);
};

const selectByLayerPrompt = () => {
  if (
    !layers ||
    layers.length === 0
  ) {
    window.alert(
      "No layers available."
    );
    return;
  }

  const layerList = layers
    .map(
      (layer, index) =>
        `${index + 1}. ${layer.name}${
          layer.visible
            ? ""
            : " (Hidden)"
        }`
    )
    .join("\n");

  const input = window.prompt(
    `Select objects from layer:\n\n${layerList}\n\nEnter layer number:`,
    "1"
  );

  if (input === null) {
    return;
  }

  const layerNumber = parseInt(
    input.trim(),
    10
  );

  if (
    !Number.isInteger(layerNumber) ||
    layerNumber < 1 ||
    layerNumber > layers.length
  ) {
    window.alert(
      "Enter a valid layer number."
    );
    return;
  }

  const selectedLayer =
    layers[layerNumber - 1];

  if (!selectedLayer) {
    window.alert(
      "Layer not found."
    );
    return;
  }

  if (!selectedLayer.visible) {
    window.alert(
      "This layer is hidden."
    );
    return;
  }

  const selectedLayerId =
    selectedLayer.id;

  const indexes = objects
    .map((object, index) => {
      /* HIDDEN OBJECTS ARE NOT SELECTABLE */
      if (
        object?.hidden
      ) {
        return null;
      }

      const objectLayerId =
        object?.layerId ||
        "layer-0";

      return objectLayerId ===
        selectedLayerId
        ? index
        : null;
    })
    .filter(
      (index) =>
        index !== null
    );

  if (indexes.length === 0) {
    window.alert(
      "No visible objects found on this layer."
    );
  }

  setSelectedIndexes(
    indexes
  );

  setSelectedIndex(
    indexes.length > 0
      ? indexes[
          indexes.length - 1
        ]
      : null
  );
};

const showObjectCount = () => {
  const counts = {};

  objects.forEach((object) => {
    const type =
      object?.type || "unknown";

    counts[type] =
      (counts[type] || 0) + 1;
  });

  const message =
    Object.entries(counts)
      .map(
        ([type, count]) =>
          `${type}: ${count}`
      )
      .join("\n");

  window.alert(
    objects.length > 0
      ? `Total Objects: ${objects.length}\n\n${message}`
      : "No objects in drawing."
  );
};

const selectByColorPrompt = () => {
  const input = window.prompt(
    "Enter HEX color (example: #ff0000):",
    "#ffffff"
  );

  if (input === null) {
    return;
  }

  const color =
    input.trim().toLowerCase();

  if (
    !/^#[0-9a-fA-F]{6}$/.test(
      color
    )
  ) {
    window.alert(
      "Please enter a valid HEX color."
    );
    return;
  }

  const indexes = objects
    .map((object, index) =>
      String(
        object?.color || "#ffffff"
      ).toLowerCase() === color
        ? index
        : null
    )
    .filter(
      (index) => index !== null
    );

  setSelectedIndexes(indexes);

  setSelectedIndex(
    indexes.length > 0
      ? indexes[indexes.length - 1]
      : null
  );
};

const changeSelectedColor = () => {
  if (selectedIndex === null || !selectedObject) {
    window.alert("Select an object first.");
    return;
  }

  const currentColor =
    selectedObject.color || "#ffffff";

  const newColor = window.prompt(
    "Enter color (example: #ff0000):",
    currentColor
  );

  if (!newColor || !newColor.trim()) {
    return;
  }

  const color = newColor.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    window.alert(
      "Please enter a valid HEX color like #ff0000."
    );
    return;
  }

  updateSelectedObject("color", color);
};

const editSelectedText = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert(
      "Select a text object first."
    );
    return;
  }

  if (selectedObject.type !== "text") {
    window.alert(
      "Edit Text works only with text objects."
    );
    return;
  }

  const newText = window.prompt(
    "Enter new text:",
    selectedObject.text || ""
  );

  if (
    newText === null
  ) {
    return;
  }

  updateSelectedObject(
    "text",
    newText
  );
};

const moveSelectedToLayerPrompt = () => {
  if (
    selectedIndex === null ||
    !selectedObject
  ) {
    window.alert("Select an object first.");
    return;
  }

  if (!layers || layers.length === 0) {
    window.alert("No layers available.");
    return;
  }

  const layerList = layers
    .map(
      (layer, index) =>
        `${index + 1}. ${layer.name}`
    )
    .join("\n");

  const input = window.prompt(
    `Move object to layer:\n\n${layerList}\n\nEnter layer number:`,
    "1"
  );

  if (input === null) {
    return;
  }

  const layerNumber = parseInt(
    input.trim(),
    10
  );

  if (
    !Number.isInteger(layerNumber) ||
    layerNumber < 1 ||
    layerNumber > layers.length
  ) {
    window.alert("Invalid layer number.");
    return;
  }

  const targetLayer =
    layers[layerNumber - 1];

  moveSelectedToLayer(
    targetLayer.id
  );
};

const saveDrawingAs = () => {
  const drawingData = {
    objects: objects,
    measurements: measurements,
    layers: layers,
    activeLayerId: activeLayerId,
  };

  const json = JSON.stringify(
    drawingData,
    null,
    2
  );

  const fileName = window.prompt(
    "Enter drawing file name:",
    "mycad-drawing"
  );

  if (!fileName || !fileName.trim()) {
    return;
  }

  const safeName = fileName
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_");

  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/* =========================
   AUTO SAVE
========================= */

useEffect(() => {
  const autoSaveTimer = setTimeout(() => {
    try {
      const drawingData = {
        objects,
        measurements,
        layers,
        activeLayerId,
        savedAt: Date.now(),
      };

      localStorage.setItem(
        "mycad-autosave",
        JSON.stringify(drawingData)
      );
    } catch (error) {
      console.error(
        "Auto-save failed:",
        error
      );
    }
  }, 500);

  return () => {
    clearTimeout(autoSaveTimer);
  };
}, [
  objects,
  measurements,
  layers,
  activeLayerId,
]);

 /* =========================
   SAVE DRAWING
========================= */

const saveDrawing = () => {
  try {
    const drawingData = {
      objects,
      measurements,
      layers,
      activeLayerId,
      savedAt: Date.now(),
      drawingName: "Drawing1.dwg",
    };

    localStorage.setItem(
      "mycad-autosave",
      JSON.stringify(drawingData)
    );

    setSaveMessage("Drawing1.dwg saved.");
  } catch (error) {
    console.error("Save failed:", error);

    setSaveMessage("Save failed. Try again.");
  }
};

 const importDXF = (event) => {
  const file =
    event.target.files?.[0];

  if (!file) {
    return;
  }

  const reader =
    new FileReader();

  reader.onload = (
    loadEvent
  ) => {
    const text =
      loadEvent.target.result;

    if (
      typeof text !==
      "string"
    ) {
      window.alert(
        "Invalid DXF file."
      );
      return;
    }

    const values =
      text
        .split(/\r?\n/)
        .map((value) =>
          value.trim()
        );

    const importedObjects =
      [];

    for (
      let i = 0;
      i <
        values.length - 1;
      i += 1
    ) {
      const code =
        values[i];

      const value =
        values[i + 1];

      /* =========================
         LINE
      ========================= */

      if (
        code === "0" &&
        value === "LINE"
      ) {
        let x1 = null;
        let y1 = null;
        let x2 = null;
        let y2 = null;

        for (
          let j = i + 2;
          j <
            Math.min(
              i + 30,
              values.length - 1
            );
          j += 2
        ) {
          const groupCode =
            values[j];

          const groupValue =
            values[j + 1];

          if (
            groupCode === "10"
          ) {
            x1 =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "20"
          ) {
            y1 =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "11"
          ) {
            x2 =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "21"
          ) {
            y2 =
              parseFloat(
                groupValue
              );
          }

          if (
            x1 !== null &&
            y1 !== null &&
            x2 !== null &&
            y2 !== null
          ) {
            break;
          }
        }

        if (
          Number.isFinite(x1) &&
          Number.isFinite(y1) &&
          Number.isFinite(x2) &&
          Number.isFinite(y2)
        ) {
          importedObjects.push({
            type: "line",

            points: [
              x1,
              y1,
              x2,
              y2,
            ],

            color:
              "#ffffff",

            strokeWidth: 2,

            layerId:
              activeLayerId,

            locked: false,

            hidden: false,
          });
        }
      }

            /* =========================
         LWPOLYLINE
      ========================= */

      if (
        code === "0" &&
        value === "LWPOLYLINE"
      ) {
        const points = [];

        let currentX = null;

        for (
          let j = i + 2;
          j < values.length - 1;
          j += 2
        ) {
          const groupCode =
            values[j];

          const groupValue =
            values[j + 1];

          /* Next DXF entity start */
          if (
            groupCode === "0"
          ) {
            break;
          }

          if (
            groupCode === "10"
          ) {
            currentX =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "20" &&
            Number.isFinite(
              currentX
            )
          ) {
            const currentY =
              parseFloat(
                groupValue
              );

            if (
              Number.isFinite(
                currentY
              )
            ) {
              points.push(
                currentX,
                currentY
              );
            }

            currentX = null;
          }
        }

        if (
          points.length >= 4
        ) {
          importedObjects.push({
            type: "polyline",

            points,

            rotation: 0,

            color:
              "#ffffff",

            strokeWidth: 2,

            layerId:
              activeLayerId,

            locked: false,

            hidden: false,
          });
        }
      }

      /* =========================
   HATCH
========================= */

if (
  code === "0" &&
  value === "HATCH"
) {
  const hatchPoints = [];

  let hatchAngle = 45;
  let hatchSpacing = 12;

  for (
    let j = i + 2;
    j < values.length - 1;
    j += 2
  ) {
    const groupCode =
      values[j];

    const groupValue =
      values[j + 1];

    /* Next DXF entity */
    if (
      groupCode === "0"
    ) {
      break;
    }

    /* Boundary X */
    if (
      groupCode === "10"
    ) {
      const x =
        parseFloat(groupValue);

      const nextCode =
        values[j + 2];

      const nextValue =
        values[j + 3];

      if (
        Number.isFinite(x) &&
        nextCode === "20"
      ) {
        const y =
          parseFloat(nextValue);

        if (
          Number.isFinite(y)
        ) {
          hatchPoints.push({
            x,
            y,
          });
        }
      }
    }

    /* Pattern angle */
    if (
      groupCode === "52"
    ) {
      const parsedAngle =
        parseFloat(groupValue);

      if (
        Number.isFinite(
          parsedAngle
        )
      ) {
        hatchAngle =
          parsedAngle;
      }
    }

    /* Pattern spacing */
    if (
      groupCode === "41"
    ) {
      const parsedSpacing =
        parseFloat(groupValue);

      if (
        Number.isFinite(
          parsedSpacing
        ) &&
        parsedSpacing > 0
      ) {
        hatchSpacing =
          parsedSpacing;
      }
    }
  }

  if (
    hatchPoints.length >= 4
  ) {
    const xs =
      hatchPoints.map(
        (point) => point.x
      );

    const ys =
      hatchPoints.map(
        (point) => point.y
      );

    const minX =
      Math.min(...xs);

    const maxX =
      Math.max(...xs);

    const minY =
      Math.min(...ys);

    const maxY =
      Math.max(...ys);

    importedObjects.push({
      type: "hatch",

      x: minX,
      y: minY,

      width:
        maxX - minX,

      height:
        maxY - minY,

      rotation: 0,

      color: "#ffffff",

      strokeWidth: 1,

      hatchColor:
        "#00aaff",

      hatchSpacing,

      hatchAngle,

      layerId:
        activeLayerId,

      locked: false,

      hidden: false,
    });
  }
}

      /* =========================
         CIRCLE
      ========================= */

      if (
        code === "0" &&
        value === "CIRCLE"
      ) {
        let x = null;
        let y = null;
        let radius = null;

        for (
          let j = i + 2;
          j <
            Math.min(
              i + 20,
              values.length - 1
            );
          j += 2
        ) {
          const groupCode =
            values[j];

          const groupValue =
            values[j + 1];

          if (
            groupCode === "10"
          ) {
            x =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "20"
          ) {
            y =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "40"
          ) {
            radius =
              parseFloat(
                groupValue
              );
          }

          if (
            x !== null &&
            y !== null &&
            radius !== null
          ) {
            break;
          }
        }

        if (
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          Number.isFinite(radius)
        ) {
          importedObjects.push({
            type: "circle",

            x,
            y,
            radius,

            color:
              "#ffffff",

            strokeWidth: 2,

            layerId:
              activeLayerId,

            locked: false,

            hidden: false,
          });
        }
      }
    }

    /* =========================
   ELLIPSE — DXF IMPORT
========================= */

if (
  code === "0" &&
  value === "ELLIPSE"
) {
  let x = null;
  let y = null;
  let majorX = null;
  let majorY = null;
  let ratio = null;

  for (
    let j = i + 2;
    j < values.length - 1;
    j += 2
  ) {
    const groupCode = values[j];
    const groupValue = values[j + 1];

    // Next DXF entity starts
    if (groupCode === "0") {
      break;
    }

    if (groupCode === "10") {
      x = parseFloat(groupValue);
    } else if (groupCode === "20") {
      y = parseFloat(groupValue);
    } else if (groupCode === "11") {
      majorX = parseFloat(groupValue);
    } else if (groupCode === "21") {
      majorY = parseFloat(groupValue);
    } else if (groupCode === "40") {
      ratio = parseFloat(groupValue);
    }
  }

  if (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(majorX) &&
    Number.isFinite(majorY) &&
    Number.isFinite(ratio) &&
    ratio > 0 &&
    ratio <= 1
  ) {
    const radiusX = Math.hypot(
      majorX,
      majorY
    );

    const radiusY = radiusX * ratio;

    const rotation =
      Math.atan2(majorY, majorX) *
      (180 / Math.PI);

    if (radiusX > 0 && radiusY > 0) {
      importedObjects.push({
        type: "ellipse",
        x,
        y,
        radiusX,
        radiusY,
        rotation,
        color: "#ffffff",
        strokeWidth: 2,
        layerId: activeLayerId,
        locked: false,
        hidden: false,
      });
    }
  }
}
    
/* =========================
 ARC
========================= */

      if (
        code === "0" &&
        value === "ARC"
      ) {
        let x = null;
        let y = null;
        let radius = null;
        let startAngle = null;
        let endAngle = null;

        for (
          let j = i + 2;
          j <
          Math.min(
            i + 30,
            values.length - 1
          );
          j += 2
        ) {
          const groupCode =
            values[j];

          const groupValue =
            values[j + 1];

          if (
            groupCode === "10"
          ) {
            x =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "20"
          ) {
            y =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "40"
          ) {
            radius =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "50"
          ) {
            startAngle =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "51"
          ) {
            endAngle =
              parseFloat(
                groupValue
              );
          }

          if (
            x !== null &&
            y !== null &&
            radius !== null &&
            startAngle !== null &&
            endAngle !== null
          ) {
            break;
          }
        }

        if (
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          Number.isFinite(radius) &&
          Number.isFinite(startAngle) &&
          Number.isFinite(endAngle)
        ) {
          importedObjects.push({
            type: "arc",

            x,
            y,
            radius,

            angleStart:
              startAngle *
              (Math.PI / 180),

            angleEnd:
              endAngle *
              (Math.PI / 180),

            rotation: 0,

            color:
              "#ffffff",

            strokeWidth: 2,

            layerId:
              activeLayerId,

            locked: false,

            hidden: false,
          });
        }
      }

            /* =========================
         TEXT
      ========================= */

      if (
        code === "0" &&
        value === "TEXT"
      ) {
        let x = null;
        let y = null;
        let fontSize = null;
        let rotation = 0;
        let textValue = "";

        for (
          let j = i + 2;
          j <
          Math.min(
            i + 30,
            values.length - 1
          );
          j += 2
        ) {
          const groupCode =
            values[j];

          const groupValue =
            values[j + 1];

          if (
            groupCode === "10"
          ) {
            x =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "20"
          ) {
            y =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "40"
          ) {
            fontSize =
              parseFloat(
                groupValue
              );
          }

          if (
            groupCode === "50"
          ) {
            rotation =
              parseFloat(
                groupValue
              ) || 0;
          }

          if (
            groupCode === "1"
          ) {
            textValue =
              String(
                groupValue || ""
              );
          }
        }

        if (
          Number.isFinite(x) &&
          Number.isFinite(y)
        ) {
          importedObjects.push({
            type: "text",

            x,
            y,

            text:
              textValue,

            fontSize:
              Number.isFinite(
                fontSize
              )
                ? fontSize
                : 24,

            rotation,

            color:
              "#ffffff",

            strokeWidth: 2,

            layerId:
              activeLayerId,

            locked: false,

            hidden: false,
          });
        }
      }
    if (
      importedObjects.length === 0
    ) {
      window.alert(
        "No supported LINE, CIRCLE, RECTANGLE, POLYLINE, ARC or TEXT objects found in this DXF."
      );
      return;
    }

    const previousObjects = [
      ...objects,
    ];

    setObjects(
      (previousObjectsState) => [
        ...previousObjectsState,
        ...importedObjects,
      ]
    );

    saveHistory(
      previousObjects,
      [...measurements]
    );

    setSelectedIndex(
      null
    );

    setSelectedIndexes([]);

    setSelectedMeasurementIndex(
      null
    );
  };

  reader.onerror = () => {
    window.alert(
      "Could not read the DXF file."
    );
  };

  reader.readAsText(file);

  event.target.value = "";
};

  const openDrawing = () => {
    const input =
      document.createElement("input");

    input.type = "file";
    input.accept =
      ".json,application/json";

    input.onchange =
      async (event) => {
        const file =
          event.target.files?.[0];

        if (!file) return;

        try {
          const text =
            await file.text();

          const data =
            JSON.parse(text);

          if (
            !data ||
            !Array.isArray(
              data.objects
            )
          ) {
            window.alert(
              "Invalid MyCAD drawing file."
            );
            return;
          }

          const loadedLayers =
            Array.isArray(
              data.layers
            )
              ? data.layers
              : [
                  {
                    id: "layer-0",
                    name: "Layer 0",
                    visible: true,
                  },
                ];

          const loadedMeasurements =
            Array.isArray(
              data.measurements
            )
              ? data.measurements
              : [];

          setObjects(
            data.objects
          );

          setMeasurements(
            loadedMeasurements
          );

          setLayers(
            loadedLayers
          );

          setActiveLayerId(
            data.activeLayerId ||
              loadedLayers[0].id
          );

          setSelectedIndex(
            null
          );

          setCommandFirstIndex(
            null
          );

          setMeasureStart(
            null
          );

          setIsDrawing(
            false
          );

          setPast([]);

          setFuture([]);

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
        } catch (error) {
          console.error(
            error
          );

          window.alert(
            "Could not open drawing file."
          );
        }
      };

    input.click();
  };

const restoreAutoSave = () => {
  try {
    const saved =
      localStorage.getItem(
        "mycad-autosave"
      );

    if (!saved) {
      window.alert(
        "No auto-saved drawing found."
      );
      return;
    }

    const drawingData =
      JSON.parse(saved);

    setObjects(
      Array.isArray(
        drawingData.objects
      )
        ? drawingData.objects
        : []
    );

    setMeasurements(
      Array.isArray(
        drawingData.measurements
      )
        ? drawingData.measurements
        : []
    );

    if (
      Array.isArray(
        drawingData.layers
      ) &&
      drawingData.layers.length > 0
    ) {
      setLayers(
        drawingData.layers
      );
    }

    if (
      drawingData.activeLayerId
    ) {
      setActiveLayerId(
        drawingData.activeLayerId
      );
    }

    setSelectedIndex(null);
    setSelectedIndexes([]);
    setSelectedMeasurementIndex(null);

    setPast([]);
    setFuture([]);

    setScale(1);
    setPosition({
      x: 0,
      y: 0,
    });

    changeTool("select");

    window.alert(
      "Auto-saved drawing restored."
    );
  } catch (error) {
    console.error(
      "Restore failed:",
      error
    );

    window.alert(
      "Auto-save data is invalid."
    );
  }
};

/* =========================
   CLEAR AUTO SAVE
========================= */

const clearAutoSave = () => {
  const confirmClear =
    window.confirm(
      "Are you sure you want to delete the auto-saved drawing?"
    );

  if (!confirmClear) {
    return;
  }

  try {
    localStorage.removeItem(
      "mycad-autosave"
    );

    window.alert(
      "Auto-save cleared."
    );
  } catch (error) {
    console.error(
      "Clear auto-save failed:",
      error
    );

    window.alert(
      "Could not clear auto-save."
    );
  }
};

    /* =========================
     EXPORT PNG
  ========================= */

  const exportPNG = () => {
    const stage =
      stageRef.current;

    if (!stage) {
      window.alert(
        "Canvas is not ready."
      );
      return;
    }

    const dataURL =
      stage.toDataURL({
        pixelRatio: 2,
      });

    const link =
      document.createElement("a");

    link.href = dataURL;
    link.download =
      "mycad-drawing.png";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  const exportDXF = () => {
  let dxf = "";

  dxf += "0\nSECTION\n2\nHEADER\n";
  dxf += "0\nENDSEC\n";
  dxf += "0\nSECTION\n2\nENTITIES\n";

  objects.forEach((object) => {
    if (!object) return;

    if (object.type === "line" && object.points?.length >= 4) {
      const [x1, y1, x2, y2] = object.points;

      dxf += "0\nLINE\n";
      dxf += "8\n0\n";
      dxf += `10\n${x1}\n`;
      dxf += `20\n${y1}\n`;
      dxf += `11\n${x2}\n`;
      dxf += `21\n${y2}\n`;
    }

    if (
      object.type === "circle" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.radius)
    ) {
      dxf += "0\nCIRCLE\n";
      dxf += "8\n0\n";
      dxf += `10\n${object.x}\n`;
      dxf += `20\n${object.y}\n`;
      dxf += `40\n${object.radius}\n`;
    }

    /* =========================
   ELLIPSE → DXF EXPORT
========================= */

if (
  object.type === "ellipse" &&
  Number.isFinite(object.x) &&
  Number.isFinite(object.y)
) {
  const rx = Math.abs(
    Number(object.radiusX) || 0
  );

  const ry = Math.abs(
    Number(object.radiusY) || 0
  );

  const rotation =
    (Number(object.rotation) || 0) *
    (Math.PI / 180);

  if (rx > 0 && ry > 0) {
    let majorX;
    let majorY;
    let ratio;

    if (rx >= ry) {
      majorX = rx * Math.cos(rotation);
      majorY = rx * Math.sin(rotation);
      ratio = ry / rx;
    } else {
      majorX = -ry * Math.sin(rotation);
      majorY = ry * Math.cos(rotation);
      ratio = rx / ry;
    }

    dxf += "0\nELLIPSE\n";
    dxf += "8\n0\n";

    dxf += `10\n${object.x}\n`;
    dxf += `20\n${object.y}\n`;
    dxf += "30\n0\n";

    dxf += `11\n${majorX}\n`;
    dxf += `21\n${majorY}\n`;
    dxf += "31\n0\n";

    dxf += `40\n${ratio}\n`;
    dxf += "41\n0\n";
    dxf += `42\n${Math.PI * 2}\n`;
  }
}

        if (
      object.type === "rectangle" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.width) &&
      Number.isFinite(object.height)
    ) {
      const x =
        Number(object.x);

      const y =
        Number(object.y);

      const w =
        Number(object.width);

      const h =
        Number(object.height);

      const rotation =
        (Number(object.rotation) || 0) *
        (Math.PI / 180);

      const centerX =
        x + w / 2;

      const centerY =
        y + h / 2;

      const corners = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ];

      const rotatedPoints =
        corners.map(
          ([px, py]) => {
            const dx =
              px - centerX;

            const dy =
              py - centerY;

            return [
              centerX +
                dx *
                  Math.cos(rotation) -
                dy *
                  Math.sin(rotation),

              centerY +
                dx *
                  Math.sin(rotation) +
                dy *
                  Math.cos(rotation),
            ];
          }
        );

      for (
        let i = 0;
        i < rotatedPoints.length;
        i++
      ) {
        const [
          x1,
          y1,
        ] = rotatedPoints[i];

        const [
          x2,
          y2,
        ] =
          rotatedPoints[
            (i + 1) %
            rotatedPoints.length
          ];

        dxf += "0\nLINE\n";
        dxf += "8\n0\n";
        dxf += `10\n${x1}\n`;
        dxf += `20\n${y1}\n`;
        dxf += `11\n${x2}\n`;
        dxf += `21\n${y2}\n`;
      }
    }

/* =========================
 HATCH
========================= */

    if (
      object.type === "hatch" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y) &&
      Number.isFinite(object.width) &&
      Number.isFinite(object.height)
    ) {
      const x =
        Number(object.x) || 0;

      const y =
        Number(object.y) || 0;

      const width =
        Math.abs(Number(object.width)) || 0;

      const height =
        Math.abs(Number(object.height)) || 0;

      const hatchAngle =
        Number(object.hatchAngle) || 45;

      const hatchSpacing =
        Math.max(
          1,
          Number(object.hatchSpacing) || 12
        );

      const minX = Math.min(
        x,
        x + Number(object.width)
      );

      const minY = Math.min(
        y,
        y + Number(object.height)
      );

      dxf += "0\nHATCH\n";
      dxf += "8\n0\n";

      /* Pattern name */
      dxf += "2\nUSERHATCH\n";

      /* Solid fill flag = 0 */
      dxf += "70\n0\n";

      /* Associative = 0 */
      dxf += "71\n0\n";

      /* One boundary path */
      dxf += "91\n1\n";

      /* External + polyline boundary */
      dxf += "92\n18\n";

      /* Bulge flag */
      dxf += "72\n0\n";

      /* Closed polyline */
      dxf += "73\n1\n";

      /* 4 rectangle vertices */
      dxf += "93\n4\n";

      dxf += `10\n${minX}\n`;
      dxf += `20\n${minY}\n`;

      dxf += `10\n${minX + width}\n`;
      dxf += `20\n${minY}\n`;

      dxf += `10\n${minX + width}\n`;
      dxf += `20\n${minY + height}\n`;

      dxf += `10\n${minX}\n`;
      dxf += `20\n${minY + height}\n`;

      /* No source boundary path */
      dxf += "97\n0\n";

      /* Hatch style */
      dxf += "75\n0\n";

      /* User-defined pattern */
      dxf += "76\n0\n";

      /* Pattern angle */
      dxf += `52\n${hatchAngle}\n`;

      /* Pattern scale = spacing */
      dxf += `41\n${hatchSpacing}\n`;

      /* Double hatch off */
      dxf += "77\n0\n";

      /* One pattern line */
      dxf += "78\n1\n";

      dxf += `53\n${hatchAngle}\n`;
      dxf += `43\n0\n`;
      dxf += `44\n0\n`;
      dxf += `45\n${hatchSpacing}\n`;
      dxf += "46\n0\n";
      dxf += "79\n0\n";
    }

        if (
      object.type === "polyline" &&
      Array.isArray(object.points) &&
      object.points.length >= 4
    ) {
      dxf += "0\nLWPOLYLINE\n";
      dxf += "8\n0\n";

      const vertexCount =
        object.points.length / 2;

      dxf += `90\n${vertexCount}\n`;

      dxf += "70\n0\n";

      for (
        let i = 0;
        i < object.points.length;
        i += 2
      ) {
        dxf += `10\n${object.points[i]}\n`;
        dxf += `20\n${object.points[i + 1]}\n`;
      }
    }


        if (
      object.type === "text" &&
      Number.isFinite(object.x) &&
      Number.isFinite(object.y)
    ) {
      const textValue =
        String(object.text || "")
          .replace(/\r?\n/g, " ");

      const fontSize =
        Number(object.fontSize) || 24;

      const rotation =
        Number(object.rotation) || 0;

      dxf += "0\nTEXT\n";
      dxf += "8\n0\n";
      dxf += `10\n${object.x}\n`;
      dxf += `20\n${object.y}\n`;
      dxf += `40\n${fontSize}\n`;
      dxf += `1\n${textValue}\n`;
      dxf += `50\n${rotation}\n`;
    }
  });

  dxf += "0\nENDSEC\n";
  dxf += "0\nEOF\n";

  const blob = new Blob([dxf], {
    type: "application/dxf",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "mycad-drawing.dxf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

    /* =========================
     EXPORT SVG
  ========================= */

  const exportSVG = () => {
    if (objects.length === 0) {
      window.alert(
        "There is no drawing to export."
      );
      return;
    }

    const padding = 50;

    const points = [];

    objects.forEach((object) => {
      if (
        object.type === "line" ||
        object.type === "polyline"
      ) {
        for (
          let i = 0;
          i < object.points.length;
          i += 2
        ) {
          points.push({
            x: object.points[i],
            y: object.points[i + 1],
          });
        }
      }

     if (
  object.type === "circle" ||
  object.type === "arc"
) {
  const radius =
    Number(object.radius) || 0;

  points.push({
    x:
      (object.x || 0) -
      radius,
    y:
      (object.y || 0) -
      radius,
  });

  points.push({
    x:
      (object.x || 0) +
      radius,
    y:
      (object.y || 0) +
      radius,
  });
}

if (object.type === "text") {
  const fontSize =
    Number(object.fontSize) || 24;

  points.push({
    x: object.x || 0,
    y: object.y || 0,
  });

  points.push({
    x:
      (object.x || 0) +
      fontSize * 5,
    y:
      (object.y || 0) +
      fontSize,
  });
}


      if (
        object.type === "rectangle"
      ) {
        points.push({
          x: object.x || 0,
          y: object.y || 0,
        });

        points.push({
          x:
            (object.x || 0) +
            (object.width || 0),
          y:
            (object.y || 0) +
            (object.height || 0),
        });
      }
    });

    if (points.length === 0) {
      window.alert(
        "Nothing can be exported."
      );
      return;
    }

    const minX = Math.min(
      ...points.map(
        (point) => point.x
      )
    );

    const minY = Math.min(
      ...points.map(
        (point) => point.y
      )
    );

    const maxX = Math.max(
      ...points.map(
        (point) => point.x
      )
    );

    const maxY = Math.max(
      ...points.map(
        (point) => point.y
      )
    );

    const width =
      Math.max(
        100,
        maxX - minX + padding * 2
      );

    const height =
      Math.max(
        100,
        maxY - minY + padding * 2
      );

    const offsetX =
      -minX + padding;

    const offsetY =
      -minY + padding;

    const svgElements = [];

    objects.forEach(
      (object) => {
        const stroke =
          object.color ||
          "#ffffff";

        const strokeWidth =
          object.strokeWidth ||
          2;

        const rotation =
          object.rotation ||
          0;

        if (
          object.type === "line"
        ) {
          const [
            x1,
            y1,
            x2,
            y2,
          ] = object.points;

          svgElements.push(
            `<line
              x1="${x1 + offsetX}"
              y1="${y1 + offsetY}"
              x2="${x2 + offsetX}"
              y2="${y2 + offsetY}"
              stroke="${stroke}"
              stroke-width="${strokeWidth}"
              fill="none"
            />`
          );
        }

        if (
          object.type ===
          "polyline"
        ) {
          const pointString =
            object.points
              .reduce(
                (
                  result,
                  value,
                  index
                ) => {
                  if (
                    index % 2 === 0
                  ) {
                    result.push(
                      `${value + offsetX},${
                        object.points[
                          index + 1
                        ] +
                        offsetY
                      }`
                    );
                  }

                  return result;
                },
                []
              )
              .join(" ");

          svgElements.push(
            `<polyline
              points="${pointString}"
              stroke="${stroke}"
              stroke-width="${strokeWidth}"
              fill="none"
            />`
          );
        }

        if (
          object.type ===
          "circle"
        ) {
          svgElements.push(
            `<circle
              cx="${object.x + offsetX}"
              cy="${object.y + offsetY}"
              r="${object.radius}"
              stroke="${stroke}"
              stroke-width="${strokeWidth}"
              fill="none"
            />`
          );
        }

                if (
          object.type ===
          "hatch"
        ) {
          const hatchWidth =
            Math.abs(
              Number(object.width) || 0
            );

          const hatchHeight =
            Math.abs(
              Number(object.height) || 0
            );

          const hatchSpacing =
            Math.max(
              4,
              Number(
                object.hatchSpacing
              ) || 12
            );

          const hatchAngle =
            Number(
              object.hatchAngle
            ) || 45;

          const patternId =
            `hatch-pattern-${index}`;

          const hatchX =
            Math.min(
              object.x || 0,
              (object.x || 0) +
                (object.width || 0)
            );

          const hatchY =
            Math.min(
              object.y || 0,
              (object.y || 0) +
                (object.height || 0)
            );

          const centerX =
            hatchX +
            hatchWidth / 2;

          const centerY =
            hatchY +
            hatchHeight / 2;

          const hatchRotation =
            hatchAngle +
            (Number(
              object.rotation
            ) || 0);

          svgElements.push(
            `<defs>
              <pattern
                id="${patternId}"
                width="${hatchSpacing}"
                height="${hatchSpacing}"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(${hatchRotation})"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="${hatchSpacing}"
                  stroke="${
                    object.hatchColor ||
                    "#00aaff"
                  }"
                  stroke-width="${
                    object.strokeWidth ||
                    1
                  }"
                />
              </pattern>
            </defs>

            <rect
              x="${hatchX + offsetX}"
              y="${hatchY + offsetY}"
              width="${hatchWidth}"
              height="${hatchHeight}"
              fill="url(#${patternId})"
              stroke="${stroke}"
              stroke-width="${strokeWidth}"
              transform="rotate(${rotation} ${
                centerX + offsetX
              } ${
                centerY + offsetY
              })"
            />`
          );
        }

        if (
          object.type ===
          "rectangle"
        ) {
          svgElements.push(
            `<rect
              x="${object.x + offsetX}"
              y="${object.y + offsetY}"
              width="${Math.abs(
                object.width
              )}"
              height="${Math.abs(
                object.height
              )}"
              stroke="${stroke}"
              stroke-width="${strokeWidth}"
              fill="none"
              transform="rotate(${rotation} ${
                object.x +
                offsetX +
                Math.abs(
                  object.width
                ) /
                  2
              } ${
                object.y +
                offsetY +
                Math.abs(
                  object.height
                ) /
                  2
              })"
            />`
          );
        }

        if (
          object.type ===
          "arc"
        ) {
          const start =
            object.angleStart;

          const end =
            object.angleEnd;

          const startX =
            object.x +
            object.radius *
              Math.cos(start);

          const startY =
            object.y +
            object.radius *
              Math.sin(start);

          const endX =
            object.x +
            object.radius *
              Math.cos(end);

          const endY =
            object.y +
            object.radius *
              Math.sin(end);

          const largeArcFlag =
            Math.abs(
              end - start
            ) >
            Math.PI
              ? 1
              : 0;

          const sweepFlag =
            end >= start
              ? 1
              : 0;

          svgElements.push(
            `<path
              d="M ${
                startX + offsetX
              } ${
                startY + offsetY
              } A ${
                object.radius
              } ${
                object.radius
              } 0 ${
                largeArcFlag
              } ${
                sweepFlag
              } ${
                endX + offsetX
              } ${
                endY + offsetY
              }"
              stroke="${stroke}"
              stroke-width="${strokeWidth}"
              fill="none"
            />`
          );
        }

        if (
          object.type ===
          "text"
        ) {
          const safeText =
            String(
              object.text || ""
            )
              .replace(
                /&/g,
                "&amp;"
              )
              .replace(
                /</g,
                "&lt;"
              )
              .replace(
                />/g,
                "&gt;"
              );

          svgElements.push(
            `<text
              x="${object.x + offsetX}"
              y="${object.y + offsetY}"
              font-size="${
                object.fontSize || 24
              }"
              fill="${stroke}"
              transform="rotate(${rotation} ${
                object.x +
                offsetX
              } ${
                object.y +
                offsetY
              })"
            >${safeText}</text>`
          );
        }
      }
    );

    const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>
  <rect
    width="100%"
    height="100%"
    fill="#111111"
  />

  ${svgElements.join("\n")}
</svg>
`;

    const blob =
      new Blob(
        [svg],
        {
          type:
            "image/svg+xml",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "mycad-drawing.svg";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  };
  /* =========================
     CHANGE TOOL
  ========================= */

  const changeTool = (
  newTool
) => {

  /* =========================
   CANCEL ACTIVE LINE
========================= */
if (
  (tool === "line" || tool === "polyline") &&
  newTool !== "line" &&
  newTool !== "polyline"
) {
  setLineStart(null);
  setLinePreview(null);
  setIsDrawing(false);
}
  
  setTool(newTool);


  const drawingTools = [
  "line",
  "polyline",
  "text",
  "rectangle",
  "circle",
  "arc",
  "ellipse",
  "hatch",
  "measure",
  "dimension",
  "radiusDimension",
  "diameterDimension",
  "angularDimension",
  "area",
  "volume",
  "quickMeasure",
];

  if (
    drawingTools.includes(
      newTool
    )
  ) {
    setSelectedIndex(
      null
    );

    setSelectedIndexes(
      []
    );
  }

  setCommandFirstIndex(
    null
  );

  setMeasureStart(
    null
  );

  setSnapPoint(
    null
  );

  setSelectedMeasurementIndex(
  null
);

setAnglePoints([]);

setArcPoints([]);

  stretchStartRef.current =
    null;

  moveStartRef.current =
    null;

  actionStartRef.current =
    null;
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

     
  // === VIDEO CLONE: Early returns for splash/home ===
  if (appPhase === "splash") {
    return (
      <div className="acad-splash">
        <div className="acad-splash-center">
          <div className="acad-big-a">A</div>
        </div>
        <div className="acad-splash-bottom">
          <div className="acad-logo-small"><span>A</span></div>
          <div className="acad-brand">AUTODESK AutoCAD</div>
          <div className="acad-loader"></div>
        </div>
      </div>
    );
  }
  if (appPhase === "preparing") {
    return (
      <div className="acad-preparing">
        <div className="acad-prep-bg"></div>
        <div className="acad-loader big blue"></div>
        <p>Preparing...</p>
        <div className="acad-splash-bottom">
          <div className="acad-logo-small"><span>A</span></div>
          <div className="acad-brand">AUTODESK AutoCAD</div>
          <div className="acad-loader"></div>
        </div>
      </div>
    );
  }
  if (appPhase === "home") {
    return (
      <div className="acad-home">
        <div className="acad-home-top">
          <div className="avatar">AS</div>
          <div className="home-brand"><span>A</span> AUTODESK AutoCAD</div>
        </div>
        <div className="trial-banner">
          <span>ⓘ 12 days left in your trial.</span>
          <button className="buy">Buy Now</button>
          <span className="close">✕</span>
        </div>
        <div className="home-content">
          <h3>Recent</h3>
          <p className="muted">Recently opened drawings will appear here as you use AutoCAD on different devices.</p>
          <div className="recent-card" onClick={() => setAppPhase("editor")}>
            <div className="dwg-thumb"></div>
            <div><b>Drawing.dwg</b><br/><small>Monday on Android • AutoCAD Web</small></div>
          </div>
          <h3>Sources</h3>
          <div className="source-item" onClick={() => setAppPhase("editor")}><i>⌂</i> <div>AutoCAD Web<br/><small>ankitshingh202502@gmail.com</small></div><span>⋮</span></div>
          <div className="source-item" onClick={() => setAppPhase("editor")}><i>📁</i> <div>Open from device</div></div>
          <div className="source-item"><i>📦</i> <div>Autodesk Projects</div></div>
          <div className="source-item"><i>☁</i> <div>Add Storage Source...</div></div>
        </div>
      </div>
    );
  }

      /* =====================================================
   HOME / RECENT SCREEN
===================================================== */

if (showHome) {
  
  return (
    <div className="cad-home">

      {/* HEADER */}
      <div className="cad-home-header">

        <div className="cad-home-brand">
          <div className="cad-home-menu">☰</div>

          <div>
            <div className="cad-home-title">
              AutoCAD
            </div>

            <div className="cad-home-subtitle">
              Mobile
            </div>
          </div>
        </div>

        <button
          type="button"
          className="cad-home-profile"
        >
          👤
        </button>

      </div>


      {/* TRIAL / ACCOUNT BANNER */}
      <div className="cad-home-banner">

        <div>
          <strong>
            AutoCAD
          </strong>

          <div>
            Start creating your drawings
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHome(false)}
        >
          Continue
        </button>

      </div>


      {/* RECENT */}
      <section className="cad-home-section">

        <div className="cad-home-section-title">
          Recent
        </div>

        <button
          type="button"
          className="cad-recent-card"
          onClick={() => setShowHome(false)}
        >

          <div className="cad-recent-preview">
            <div className="cad-recent-line"></div>
            <div className="cad-recent-line second"></div>
          </div>

          <div className="cad-recent-info">

            <strong>
              Drawing1.dwg
            </strong>

            <span>
              Recent drawing
            </span>

          </div>

          <span className="cad-recent-arrow">
            ›
          </span>

        </button>

      </section>


      {/* SOURCES */}
      <section className="cad-home-section">

        <div className="cad-home-section-title">
          Sources
        </div>


        <button
          type="button"
          className="cad-source-row"
        >
          <span className="cad-source-icon">
            ☁
          </span>

          <span>
            AutoCAD Web
          </span>

          <span className="cad-source-arrow">
            ›
          </span>
        </button>


        <button
          type="button"
          className="cad-source-row"
          onClick={openDrawing}
        >
          <span className="cad-source-icon">
            📂
          </span>

          <span>
            Open from device
          </span>

          <span className="cad-source-arrow">
            ›
          </span>
        </button>


        <button
          type="button"
          className="cad-source-row"
        >
          <span className="cad-source-icon">
            📁
          </span>

          <span>
            Autodesk Projects
          </span>

          <span className="cad-source-arrow">
            ›
          </span>
        </button>


        <button
          type="button"
          className="cad-source-row"
        >
          <span className="cad-source-icon">
            ＋
          </span>

          <span>
            Add Storage Source
          </span>

          <span className="cad-source-arrow">
            ›
          </span>
        </button>

      </section>


      {/* NEW DRAWING */}
      <button
        type="button"
        className="cad-new-drawing"
        onClick={() => setShowHome(false)}
      >
        ＋ New Drawing
      </button>

    </div>
  );
}

  return (
    
  
    <div className="app">


  {/* TOP BAR */}

<div
  className="mobile-topbar"
  onTouchStart={(e) => e.stopPropagation()}
  onTouchMove={(e) => e.stopPropagation()}
  onTouchEnd={(e) => e.stopPropagation()}
  onPointerDown={(e) => e.stopPropagation()}
>

  {/* HOME */}
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      setShowHome(true);
    }}
    title="Home"
  >
    ☰
  </button>

  {/* DRAWING NAME */}
  <div className="mobile-topbar-title">
    Drawing1.dwg
  </div>

{/* UNDO */}

<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    try {
      if (undoActiveLineSegment()) {
        return;
      }

      undo();
    } catch (error) {
      console.error("Undo failed:", error);
      window.alert("Undo nahi ho paya.");
    }
  }}
  title="Undo"
  aria-label="Undo"
>
  ↶
</button>

{/* REDO */}

<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    try {
      redo();
    } catch (error) {
      console.error("Redo failed:", error);
      window.alert("Redo nahi ho paya.");
    }
  }}
  disabled={future.length === 0}
  title="Redo"
  aria-label="Redo"
>
  ↷
</button>

  {/* SAVE */}
  <button
    type="button"
    onPointerDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();

      try {
        saveDrawing();
      } catch (error) {
        console.error("Save failed:", error);
        window.alert("Save nahi ho paya.");
      }
    }}
  >
    💾
  </button>

  {/* ZOOM FIT */}
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      zoomFit();
    }}
    title="Zoom Fit"
  >
    ⌗
  </button>

  {/* RESET VIEW */}
  <button
    type="button"
    onPointerDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();

      const centerX =
        viewportSize.width / 2;

      const centerY =
        (viewportSize.height - 87 - 64) / 2;

      setScale(1);

      setPosition({
        x: centerX,
        y: centerY,
      });
    }}
    title="Reset View"
  >
    ⛶
  </button>

{/* MORE — SEND COPY / PLOT PDF */}

<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setShowMobileLayers(false);

    setShowMobileFileMenu((prev) => !prev);
  }}
  title="More options"
>
  ⋮
</button>

{/* =========================
   THREE-DOT MENU
========================= */}

{showMobileFileMenu && (
  <div
    onPointerDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "fixed",
      top: "58px",
      right: "8px",
      width: "220px",
      padding: "6px",
      background: "#202020",
      color: "#ffffff",
      border: "1px solid #414141",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      zIndex: 2000000,
      boxSizing: "border-box",
    }}
  >
    {/* SEND A COPY */}

    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();

        setShowMobileFileMenu(false);

        void shareDrawing();
      }}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "13px 12px",
        border: "none",
        borderRadius: "7px",
        background: "transparent",
        color: "#ffffff",
        textAlign: "left",
        fontSize: "14px",
        cursor: "pointer",
      }}
    >
      <span>↗</span>
      <span>Send a Copy</span>
    </button>

    {/* PLOT TO PDF */}

    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();

        setShowMobileFileMenu(false);

        plotToPDF();
      }}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "13px 12px",
        border: "none",
        borderRadius: "7px",
        background: "transparent",
        color: "#ffffff",
        textAlign: "left",
        fontSize: "14px",
        cursor: "pointer",
      }}
    >
      <span>▤</span>
      <span>Plot to PDF</span>
    </button>
  </div>
)}

{/* SAVE STATUS MESSAGE */}

{saveMessage && (
  <div
    role="status"
    style={{
      position: "fixed",
      left: "16px",
      bottom: "26%",
      zIndex: 3000000,
      background: "#eeeeee",
      color: "#555555",
      padding: "8px 12px",
      borderRadius: "4px",
      fontSize: "14px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      pointerEvents: "none",
    }}
  >
    {saveMessage}
  </div>
)}

</div>

{/* MOBILE RIGHT TOOLBAR — 1. PROPERTIES */}

<div
  className={`mobile-right-toolbar ${
    mobileRightToolbarCollapsed ? "is-collapsed" : ""
  }`}
>
  <button
    type="button"
    className={`mobile-right-tool-button ${
      showMobileProperties ? "is-active" : ""
    }`}
    title="Properties"
    aria-label="Properties"

    onPointerDown={(e) => {
      e.stopPropagation();
    }}

    onTouchStart={(e) => {
      e.stopPropagation();
    }}

    onClick={(e) => {
      e.stopPropagation();

      setShowMobileSettings(false);

       setShowMobileBlocks(false);

      setShowMobileLayers(false);
      setMobileCommandPanel("home");
      setCommandText("");

      setShowMobileProperties(
        (previous) => !previous
      );
    }}
  >
    <svg
      viewBox="0 0 32 36"
      width="36"
      height="36"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="3"
        width="22"
        height="29"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <rect
        x="9"
        y="7"
        width="14"
        height="7"
        fill="none"
        stroke="#279bce"
        strokeWidth="1.8"
      />

      <path
        d="M8 19 H24 M8 24 H24 M8 29 H24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <circle cx="13" cy="19" r="1.5" fill="#279bce" />
      <circle cx="19" cy="24" r="1.5" fill="#279bce" />
      <circle cx="14" cy="29" r="1.5" fill="#279bce" />
    </svg>
  </button>

  {/* 2. TRACE */}

<button
  type="button"
  className={`mobile-right-tool-button ${
    showMobileTrace ? "is-active" : ""
  }`}
  title="Trace"
  aria-label="Trace"

  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}

  onClick={(e) => {
    e.stopPropagation();

    setShowMobileSettings(false);

    setShowMobileBlocks(false);
    if (showMobileTrace) {
      closeMobileTracePanel();
    } else {
      setShowMobileTrace(true);
      setShowMobileLayers(false);
      setShowMobileProperties(false);
      setMobileCommandPanel("home");
      setCommandText("");
    }
  }}
>
  <svg
    viewBox="0 0 36 36"
    width="36"
    height="36"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="3"
      width="24"
      height="29"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <rect
      x="9"
      y="7"
      width="23"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <path
      d="M11 21 C14 12, 17 28, 21 18 S27 15, 29 20"
      fill="none"
      stroke="#279bce"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
</button>

{/* 3. VIEWS — MODEL / LAYOUTS */}

<button
  type="button"
  className={`mobile-right-tool-button ${
    showMobileViews ? "is-active" : ""
  }`}
  title="Views"
  aria-label="Views"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileSettings(false);

    setShowMobileBlocks(false);

    setShowMobileViews((previous) => !previous);

    setShowMobileLayers(false);
    setShowMobileProperties(false);
    setShowMobileTrace(false);
    setCommandText("");
  }}
>
  <svg
    viewBox="0 0 36 36"
    width="36"
    height="36"
    aria-hidden="true"
  >
    <rect
      x="3"
      y="5"
      width="30"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <path
      d="M5 18 Q18 5 31 18 Q18 31 5 18 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <circle
      cx="18"
      cy="18"
      r="4"
      fill="none"
      stroke="#279bce"
      strokeWidth="2"
    />
  </svg>
</button>
{/* 4. LAYERS */}

<button
  type="button"
  className={`mobile-right-tool-button ${
    showMobileLayers ? "is-active" : ""
  }`}
  title="Layers"
  aria-label="Layers"

  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}

  onClick={(e) => {
    e.stopPropagation();

    setShowMobileSettings(false);

    setShowMobileBlocks(false);

    const shouldOpen = !showMobileLayers;

    setShowMobileLayers(shouldOpen);
    setShowMobileProperties(false);
    setShowMobileTrace(false);
    setShowMobileViews(false);

    setMobileCommandPanel("home");
    setCommandText("");
  }}
>
  <svg
    viewBox="0 0 36 36"
    width="36"
    height="36"
    aria-hidden="true"
  >
    <path
      d="M18 3 L32 11 L18 19 L4 11 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />

    <path
      d="M4 17 L18 25 L32 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />

    <path
      d="M4 23 L18 31 L32 23"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
</button>

{/* 5. BLOCKS */}

<button
  type="button"
  className={`mobile-right-tool-button ${
    showMobileBlocks ? "is-active" : ""
  }`}
  title="Blocks"
  aria-label="Blocks"

  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}

  onClick={(e) => {
    e.stopPropagation();

    setShowMobileSettings(false);

    setShowMobileBlocks((previous) => !previous);

    setShowMobileLayers(false);
    setShowMobileProperties(false);
    setShowMobileTrace(false);
    setShowMobileViews(false);

    setMobileCommandPanel("home");
    setCommandText("");
  }}
>
  <svg
    viewBox="0 0 36 36"
    width="36"
    height="36"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="4"
      width="21"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <circle
      cx="26"
      cy="27"
      r="8"
      fill="#f3f3f3"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <path
      d="M4 10 H25"
      fill="none"
      stroke="#279bce"
      strokeWidth="1.5"
    />
  </svg>
</button>

{/* 6. ATTACHMENTS / REFERENCES */}

<button
  type="button"
  className={`mobile-right-tool-button ${
    showMobileAttachments ? "is-active" : ""
  }`}
  title="Attachments / References"
  aria-label="Attachments"

  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}

  onClick={(e) => {
    e.stopPropagation();

    setShowMobileSettings(false);

    setShowMobileAttachments((previous) => !previous);

    setShowMobileBlocks(false);
    setShowMobileLayers(false);
    setShowMobileProperties(false);
    setShowMobileTrace(false);
    setShowMobileViews(false);

    setMobileCommandPanel("home");
    setCommandText("");
  }}
>
  <svg
    viewBox="0 0 36 36"
    width="36"
    height="36"
    aria-hidden="true"
  >
    <path
      d="M5 10 H22 L31 19 V32 H5 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />

    <path
      d="M22 10 V19 H31"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <path
      d="M15 10 V7
         C15 3 9 3 9 8 V23
         C9 29 18 29 18 23 V12"
      fill="none"
      stroke="#279bce"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
</button>

{/* 7. SETTINGS */}

<button
  type="button"
  className={`mobile-right-tool-button ${
    showMobileSettings ? "is-active" : ""
  }`}
  title="Settings"
  aria-label="Settings"

  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}

  onClick={(e) => {
    e.stopPropagation();

    setShowMobileSettings((previous) => !previous);

    setShowMobileAttachments(false);
    setShowMobileBlocks(false);
    setShowMobileLayers(false);
    setShowMobileProperties(false);
    setShowMobileTrace(false);
    setShowMobileViews(false);

    setMobileCommandPanel("home");
    setCommandText("");
  }}
>
  <svg
    viewBox="0 0 36 36"
    width="36"
    height="36"
    aria-hidden="true"
  >
    <path
      d="M15 3 H21 L22 7
         Q24 8 26 9
         L30 7 L33 12 L30 15
         Q31 18 30 21
         L33 24 L30 29 L26 27
         Q24 29 22 29 L21 33 H15
         L14 29 Q12 29 10 27
         L6 29 L3 24 L6 21
         Q5 18 6 15 L3 12 L6 7
         L10 9 Q12 8 14 7 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />

    <circle
      cx="18"
      cy="18"
      r="6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <circle
      cx="18"
      cy="18"
      r="2"
      fill="#279bce"
    />
  </svg>
</button>

{/* COLLAPSE / EXPAND RIGHT TOOLBAR */}

<button
  type="button"
  className="mobile-right-toolbar-toggle"
  title={
    mobileRightToolbarCollapsed
      ? "Expand toolbar"
      : "Collapse toolbar"
  }
  aria-label={
    mobileRightToolbarCollapsed
      ? "Expand toolbar"
      : "Collapse toolbar"
  }
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setMobileRightToolbarCollapsed(
      (previous) => !previous
    );
  }}
>
  <svg
    viewBox="0 0 36 36"
    width="28"
    height="28"
    aria-hidden="true"
  >
    {mobileRightToolbarCollapsed ? (
      <path
        d="M10 18 L18 10 L26 18 M10 26 L18 18 L26 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M10 10 L18 18 L26 10 M10 18 L18 26 L26 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
</button>

</div>
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

      <button
  type="button"
  onClick={() => {
    window.alert("BUTTON CLICK HO RAHA HAI");
  }}
>
  Open
</button>

        <button
  type="button"
  onClick={restoreAutoSave}
>
  ♻️ Restore
</button>

<button
  type="button"
  onClick={clearAutoSave}
>
  🗑️ Clear Auto-Save
</button>

       <button
         onClick={saveDrawing}
       >
          Save
       </button>

       <button
         onClick={exportPNG}
       >
         Export PNG
       </button>

       <button
         onClick={exportSVG}
       >
          Export SVG
       </button>

       <button
          onClick={zoomFit}
       >
          Zoom Fit
       </button>

        <button
  type="button"
  onClick={() => {
    /* =========================
   LINE — MOBILE UNDO
========================= */

if (
  tool === "line" &&
  lineStart
) {
  const lastIndex =
    objects.length - 1;

  const lastObject =
    objects[lastIndex];

  if (
    lastObject &&
    lastObject.type === "line" &&
    Array.isArray(lastObject.points) &&
    lastObject.points.length >= 4
  ) {
    saveHistory(
      [...objects],
      [...measurements]
    );

    const startX =
      lastObject.points[0];

    const startY =
      lastObject.points[1];

    setObjects((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      return prev.slice(0, -1);
    });

    setLineStart({
      x: startX,
      y: startY,
    });

    setPendingLinePoint(null);
    setLineLengthInput("");
    setShowLineInput(false);

    setLinePreview({
      x1: startX,
      y1: startY,
      x2: startX,
      y2: startY,
    });

    setSnapPoint(null);
    setSnapType("");

    setIsDrawing(true);

    return;
  }

  setPendingLinePoint(null);
  setLineLengthInput("");
  setShowLineInput(false);
  setLinePreview(null);
  setIsDrawing(true);

  return;
}

    undo();
  }}
disabled={
  tool !== "line" &&
  tool !== "polyline" &&
  past.length === 0
}
>
  Undo
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
          <div
  style={{
    padding: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  }}
>
  <span
    style={{
      fontSize: "12px",
      fontWeight: "bold",
    }}
  >
    Unit
  </span>

  <select
    value={unit}
    onChange={(e) =>
      setUnit(e.target.value)
    }
    style={{
      minWidth: "70px",
      height: "36px",
      fontSize: "14px",
    }}
  >
    <option value="mm">
      MM
    </option>

    <option value="inch">
      INCH
    </option>

    <option value="ft-in">
  FT-IN
</option>
  </select>
</div>

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
            tool === "text"
              ? "active"
              : ""
          }
          onClick={() =>
            changeTool("text")
          }
          title="Text"
        >
          Text
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
               tool === "arc"
                 ? "active"
                 : ""
             }
             onClick={() =>
               changeTool("arc")
             }
             title="Arc"
          >
            ARC
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
              tool === "dimension"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool("dimension")
            }
            title="Dimension"
          >
            DIM
          </button>

          <button
            className={
              tool === "angularDimension"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "angularDimension"
              )
            }
            title="Angular Dimension"
          >
            ANG
          </button>

          <button
            className={
              tool === "radiusDimension"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "radiusDimension"
              )
            }
            title="Radius Dimension"
          >
            RAD
          </button>

          <button
            className={
              tool === "diameterDimension"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTool(
                "diameterDimension"
              )
            }
              title="Diameter Dimension"
          >
            DIA
          </button>

          <button
             className={objectSnapEnabled ? "active" : ""}
            onClick={() =>
               setObjectSnapEnabled(
                 (prev) => !prev
               )
            }
            title="Object Snap"
          >
            OSNAP
          </button>
          <button
             className={gridEnabled ? "active" : ""}
             onClick={() =>
               setGridEnabled(
                 (prev) => !prev
               )
            }
            title="Grid"
          >
            GRID
          </button>

          <button
  onClick={() =>
    setScale((prev) =>
      Math.min(prev * 1.25, 1000000)
    )
  }
  title="Zoom In"
>
  +
</button>

          <button
            onClick={() =>
              setScale((prev) =>
                Math.max(prev / 1.25, 0.000001)
              )
            }
            title="Zoom Out"
          >
            -
          </button>
          <button
             onClick={zoomFit}
             title="Zoom Fit"
          >
            FIT
          </button>

          <button
             onClick={() => {
               setScale(1);

               setPosition({
                 x: 0,
                 y: 0,
               });
             }}
             title="Zoom 100%"
          >
            100%
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
             className={orthoEnabled ? "active" : ""}
             onClick={() =>
               setOrthoEnabled(
                 (prev) => !prev
               )
            }
            title="Ortho Mode"
          >
            ORTHO
          </button>

          <button
            className={
              polarEnabled ? "active" : ""
            }
            onClick={() =>
              setPolarEnabled(
                (prev) => !prev
              )
            }
            title="Polar Tracking"
          >
            POLAR
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

         <button
  className={
    tool === "hatch"
      ? "active"
      : ""
  }
  onClick={() =>
    changeTool("hatch")
  }
  title="Hatch"
>
  Hatch
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

                <button
  onClick={(event) => {
    event.stopPropagation();

    toggleLayerLock(
      layer.id
    );
  }}
  title={
    layer.locked
      ? "Unlock Layer"
      : "Lock Layer"
  }
  style={{
    background:
      "transparent",
    border: "none",
    color:
      layer.locked
        ? "#ffcc00"
        : "#aaa",
    cursor:
      "pointer",
    padding: 0,
  }}
>
  {layer.locked
    ? "🔒"
    : "🔓"}
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
                   selectedObject?.type
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

              {selectedObject?.type !==
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

              {selectedObject?.type !==
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

              {selectedObject?.type ===
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

              {selectedObject?.type ===
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

              {/* HATCH PROPERTIES */}

{selectedObject?.type === "hatch" && (
  <>
    <div
      style={{
        marginTop: "10px",
      }}
    >
      <label
        style={{
          display: "block",
          fontSize: "12px",
          marginBottom: "4px",
          color: "#aaa",
        }}
      >
        Hatch Angle
      </label>

      <input
        type="number"
        min="0"
        max="360"
        value={
          selectedObject.hatchAngle ?? 45
        }
        onChange={(event) =>
          updateSelectedObject(
            "hatchAngle",
            event.target.value
          )
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "6px",
          background: "#222",
          color: "#fff",
          border: "1px solid #444",
        }}
      />
    </div>

    <div
      style={{
        marginTop: "10px",
      }}
    >
      <label
        style={{
          display: "block",
          fontSize: "12px",
          marginBottom: "4px",
          color: "#aaa",
        }}
      >
        Hatch Spacing
      </label>

      <input
        type="number"
        min="4"
        value={
          selectedObject.hatchSpacing ?? 12
        }
        onChange={(event) =>
          updateSelectedObject(
            "hatchSpacing",
            event.target.value
          )
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "6px",
          background: "#222",
          color: "#fff",
          border: "1px solid #444",
        }}
      />
    </div>

    <div
      style={{
        marginTop: "10px",
      }}
    >
      <label
        style={{
          display: "block",
          fontSize: "12px",
          marginBottom: "4px",
          color: "#aaa",
        }}
      >
        Hatch Color
      </label>

      <input
        type="color"
        value={
          selectedObject.hatchColor ||
          "#00aaff"
        }
        onChange={(event) =>
          updateSelectedObject(
            "hatchColor",
            event.target.value
          )
        }
        style={{
          width: "100%",
          height: "35px",
          padding: 0,
          background: "#222",
          border: "1px solid #444",
        }}
      />
    </div>
  </>
)}

{/* TEXT PROPERTIES */}

              {selectedObject?.type ===
                "text" && (
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
                      Text
                    </label>

                    <input
                      type="text"
                      value={
                        selectedObject.text ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        updateSelectedObject(
                          "text",
                          event.target.value
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
                      Font Size
                    </label>

                    <input
                      type="number"
                      min="6"
                      max="200"
                      value={
                        selectedObject.fontSize ||
                        24
                      }
                      onChange={(
                        event
                      ) =>
                        updateSelectedObject(
                          "fontSize",
                          event.target.value
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

       <main
  className="workspace"
  style={{
    background:
  "#1b1b1b",
  }}
>

          {(
  tool === "dimension" ||
  tool === "angularDimension" ||
  tool === "radiusDimension" ||
  tool === "diameterDimension"
) && (
  <div className="mobile-dimension-crosshair">
    <div className="crosshair-horizontal"></div>
    <div className="crosshair-vertical"></div>
  </div>
)}

          <Stage
            ref={stageRef}
         width={
  viewportSize.width <= 768
    ? viewportSize.width
    : viewportSize.width - 298
}
height={
  viewportSize.width <= 768
    ? viewportSize.height - 87 - 64
    : viewportSize.height - 87
}
            
    draggable={
  tool === "select" &&
  !isSelecting &&
  !isDrawing &&
  viewportSize.width > 768
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
            onMouseLeave={(e) => {
  setSnapPoint(null);

  const stage = e.target.getStage();

  if (stage) {
    stage.container().style.cursor = "default";
  }
}}
            onMouseUp={
              handleMouseUp
            }
            onDblClick={(e) => {
  if (tool === "polyline") {
    e.cancelBubble = true;
    finishPolyline();
  }
}}
            onWheel={
              handleWheel
            }

            onMouseEnter={(e) => {
  const stage = e.target.getStage();

  if (stage) {
    stage.container().style.cursor =
      tool === "select"
        ? "default"
        : "crosshair";
  }
}}

            onTouchStart={handleTouchStart}
onTouchMove={handleTouchMove}
onTouchEnd={handleTouchEnd}
          >

            <Layer listening={false}>
  <Group
    x={position.x}
    y={position.y}
    scaleX={scale}
    scaleY={scale}
    listening={false}
  >
    {gridEnabled &&
    (() => {

/* =========================
   CAD INFINITE ADAPTIVE GRID
========================= */

const canvasWidth =
  viewportSize.width <= 768
    ? viewportSize.width
    : viewportSize.width - 298;

const canvasHeight =
  viewportSize.width <= 768
    ? viewportSize.height - 87 - 64
    : viewportSize.height - 87;

/* =========================
   WORLD VIEWPORT
========================= */

const left =
  -position.x / scale;

const right =
  (canvasWidth - position.x) / scale;

const top =
  -position.y / scale;

const bottom =
  (canvasHeight - position.y) / scale;

/* =========================
   ADAPTIVE 1-2-5 GRID
========================= */

const baseGrid = GRID_SIZE;

const targetPixels = 50;

const idealStep =
  targetPixels / scale;

const relativeStep =
  idealStep / baseGrid;

const exponent = Math.floor(
  Math.log10(
    Math.max(relativeStep, 0.000001)
  )
);

const power =
  Math.pow(10, exponent);

const normalized =
  relativeStep / power;

let multiplier;

if (normalized <= 1) {
  multiplier = 1;
} else if (normalized <= 2) {
  multiplier = 2;
} else if (normalized <= 5) {
  multiplier = 5;
} else {
  multiplier = 10;
}

const gridStep =
  baseGrid *
  multiplier *
  power;

/* =========================
   MINOR GRID
   5 MINOR CELLS
========================= */

const minorGridStep =
  gridStep / 5;

const minorStartX =
  Math.floor(
    left / minorGridStep
  ) - 2;

const minorEndX =
  Math.ceil(
    right / minorGridStep
  ) + 2;

const minorStartY =
  Math.floor(
    top / minorGridStep
  ) - 2;

const minorEndY =
  Math.ceil(
    bottom / minorGridStep
  ) + 2;

const minorGridLines = [];

/* MINOR VERTICAL */

for (
  let i = minorStartX;
  i <= minorEndX;
  i++
) {
  const x =
    i * minorGridStep;

  minorGridLines.push(
    <Line
      key={`minor-v-${i}`}
      points={[
        x,
        top,
        x,
        bottom,
      ]}
      stroke="#303b4a"
strokeWidth={
  1 / scale
}
      listening={false}
    />
  );
}

/* MINOR HORIZONTAL */

for (
  let i = minorStartY;
  i <= minorEndY;
  i++
) {
  const y =
    i * minorGridStep;

  minorGridLines.push(
    <Line
      key={`minor-h-${i}`}
      points={[
        left,
        y,
        right,
        y,
      ]}
      stroke="#303b4a"
strokeWidth={
  1 / scale
}
      listening={false}
    />
  );
}

/* =========================
   MAIN GRID
========================= */

const startX =
  Math.floor(left / gridStep) - 2;

const endX =
  Math.ceil(right / gridStep) + 2;

const startY =
  Math.floor(top / gridStep) - 2;

const endY =
  Math.ceil(bottom / gridStep) + 2;

const gridLines = [];

/* MAIN VERTICAL */

for (
  let i = startX;
  i <= endX;
  i++
) {
  const x =
    i * gridStep;

  gridLines.push(
    <Line
      key={`grid-v-${i}`}
      points={[
        x,
        top,
        x,
        bottom,
      ]}
    stroke="#222a33"
strokeWidth={
  0.7 / scale
}
      listening={false}
    />
  );
}

/* MAIN HORIZONTAL */

for (
  let i = startY;
  i <= endY;
  i++
) {
  const y =
    i * gridStep;

  gridLines.push(
    <Line
      key={`grid-h-${i}`}
      points={[
        left,
        y,
        right,
        y,
      ]}
      stroke="#222a33"
strokeWidth={
  0.7 / scale
}
      listening={false}
    />
  );
}

/* =========================
   X AXIS
========================= */

gridLines.push(
  <Line
    key="x-axis"
    points={[
      left,
      0,
      right,
      0,
    ]}
    stroke="#6f3f3f"
    strokeWidth={
      1.5 / scale
    }
    listening={false}
  />
);

/* =========================
   Y AXIS
========================= */

gridLines.push(
  <Line
    key="y-axis"
    points={[
      0,
      top,
      0,
      bottom,
    ]}
    stroke="#3f6f48"
    strokeWidth={
      1.5 / scale
    }
    listening={false}
  />
);

/* =========================
   AXIS LABELS
========================= */

gridLines.push(
  <Text
    key="axis-x-label"
    x={
      right - 20 / scale
    }
    y={
      6 / scale
    }
    text="X"
    fontSize={
      12 / scale
    }
    fill="#777"
    listening={false}
  />
);

gridLines.push(
  <Text
    key="axis-y-label"
    x={
      6 / scale
    }
    y={
      top + 6 / scale
    }
    text="Y"
    fontSize={
      12 / scale
    }
    fill="#777"
    listening={false}
  />
);

/* =========================
   ORIGIN
========================= */

gridLines.push(
  <Text
    key="origin-label"
    x={8 / scale}
    y={8 / scale}
    text="0,0"
    fontSize={
      10 / scale
    }
    fill="#777"
    listening={false}
  />
);

/* =========================
   MINOR + MAIN GRID
========================= */

return [
  ...minorGridLines,
  ...gridLines,
];

})()}
</Group>
</Layer>

<Layer>

  <Group
    x={position.x}
    y={position.y}
    scaleX={scale}
    scaleY={scale}
    draggable={
  tool === "select" &&
  !isSelecting &&
  !isDrawing
}
    onDragEnd={
      handleDragEnd
    }
  >

{snapPoint && (
  <Circle
    x={snapPoint.x}
    y={snapPoint.y}
    radius={5 / scale}
    stroke="#ffd54f"
    strokeWidth={2 / scale}
    listening={false}
  />
)}

{/* =========================
   QUICK MEASURE — FINAL
========================= */}

{tool === "quickMeasure" && (() => {
  const px = mousePosition.x;
  const py = mousePosition.y;

   const TWO_PI = Math.PI * 2;

   /* =========================
     GET ARC SWEEP
  ========================= */

  const getArcSweep = (object) => {
    const start = Number(object?.angleStart);
    const end = Number(object?.angleEnd);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end)
    ) {
      return 0;
    }

    return Math.abs(end - start);
  };
  let nearest = null;
  let quickArea = null;
  const measureSegments = [];

  /* =========================
     UNIT FORMATTING
  ========================= */

  const formatLength = (rawValue) => {
    const value = Number(rawValue) || 0;

    if (unit === "inch") {
      return `${(value / 25.4).toFixed(2)} in`;
    }

    if (unit === "ft-in") {
      const sign = value < 0 ? "-" : "";
      const totalInches = Math.abs(value) / 25.4;

      let feet = Math.floor(totalInches / 12);
      let inches = Number(
        (totalInches - feet * 12).toFixed(2)
      );

      if (inches >= 12) {
        feet += 1;
        inches = 0;
      }

      return `${sign}${feet}'-${inches.toFixed(2)}"`;
    }

    return `${value.toFixed(2)} mm`;
  };

  const formatArea = (rawValue) => {
    const value = Number(rawValue) || 0;

    if (unit === "inch") {
      return `${(value / (25.4 * 25.4)).toFixed(2)} in²`;
    }

    if (unit === "ft-in") {
      return `${(value / (304.8 * 304.8)).toFixed(3)} ft²`;
    }

    return `${value.toFixed(2)} mm²`;
  };

  /* =========================
     OBJECT VISIBILITY
  ========================= */

  const isVisibleObject = (object) => {
    if (!object || object.hidden) {
      return false;
    }

    const objectLayer = layers.find(
      (layer) =>
        layer.id === (object.layerId || "layer-0")
    );

    return !objectLayer || objectLayer.visible !== false;
  };

/* =========================
   CLOSED POLYLINE CHECK
========================= */

const isClosedPolyline = (object) => {
  if (
    object?.type !== "polyline" ||
    !Array.isArray(object.points) ||
    object.points.length < 6 ||
    object.points.length % 2 !== 0
  ) {
    return false;
  }

  if (
    object.closed === true ||
    object.isClosed === true
  ) {
    return true;
  }

  const points = object.points;

  if (
    !points.every(
      (value) => Number.isFinite(Number(value))
    )
  ) {
    return false;
  }

  const firstX = Number(points[0]);
  const firstY = Number(points[1]);

  const lastX = Number(points[points.length - 2]);
  const lastY = Number(points[points.length - 1]);

  const closingDistance = Math.hypot(
    firstX - lastX,
    firstY - lastY
  );

  /* Fixed drawing-unit tolerance; independent of zoom */
  return closingDistance <= 0.5;
};

  /* =========================
     TOTAL POLYLINE LENGTH
  ========================= */

  const getPolylineLength = (object) => {
    if (
      !Array.isArray(object.points) ||
      object.points.length < 4
    ) {
      return 0;
    }

    const points = object.points;
    let total = 0;

    for (let i = 0; i < points.length - 2; i += 2) {
      total += Math.hypot(
        points[i + 2] - points[i],
        points[i + 3] - points[i + 1]
      );
    }

    if (isClosedPolyline(object)) {
      const firstX = points[0];
      const firstY = points[1];
      const lastX = points[points.length - 2];
      const lastY = points[points.length - 1];

      const closingDistance = Math.hypot(
        firstX - lastX,
        firstY - lastY
      );

      if (closingDistance > 0.001) {
        total += closingDistance;
      }
    }

    return total;
  };

  /* =========================
     OBJECT DETAILS
  ========================= */

  const getObjectSummary = (object) => {
    if (!object) {
      return "";
    }

    if (
      object.type === "circle" &&
      Number(object.radius) > 0
    ) {
      const radius = Number(object.radius);

      return (
        `R ${formatLength(radius)} | ` +
        `D ${formatLength(radius * 2)} | ` +
        `CIRC ${formatLength(TWO_PI * radius)}`
      );
    }
    if (
      object.type === "arc" &&
      Number(object.radius) > 0 &&
      Number.isFinite(object.angleStart) &&
      Number.isFinite(object.angleEnd)
    ) {
      const radius = Number(object.radius);
      const sweep = getArcSweep(object);

      return (
        `R ${formatLength(radius)} | ` +
        `SWEEP ${(sweep * 180 / Math.PI).toFixed(1)}° | ` +
        `ARC ${formatLength(radius * sweep)}`
      );
    }

    if (
      object.type === "ellipse" &&
      Number(object.radiusX) > 0 &&
      Number(object.radiusY) > 0
    ) {
      const rx = Number(object.radiusX);
      const ry = Number(object.radiusY);

      const perimeter =
        Math.PI *
        (
          3 * (rx + ry) -
          Math.sqrt(
            Math.max(
              0,
              (3 * rx + ry) * (rx + 3 * ry)
            )
          )
        );

      return (
        `RX ${formatLength(rx)} | ` +
        `RY ${formatLength(ry)} | ` +
        `PERIM ≈ ${formatLength(perimeter)}`
      );
    }

    if (
      object.type === "rectangle" ||
      object.type === "hatch"
    ) {
      const width = Math.abs(
        Number(object.width) || 0
      );

      const height = Math.abs(
        Number(object.height) || 0
      );

      return (
        `W ${formatLength(width)} | ` +
        `H ${formatLength(height)} | ` +
        `PERIM ${formatLength(2 * (width + height))}`
      );
    }

    if (
      object.type === "line" ||
      object.type === "polyline"
    ) {
      const length = getPolylineLength(object);

      return (
        `${isClosedPolyline(object) ? "PERIM" : "LENGTH"} ` +
        formatLength(length)
      );
    }

    return "";
  };

  /* =========================
     FIND NEAREST POINT
  ========================= */

  const considerPoint = (x, y, object) => {
    const distance = Math.hypot(
      px - x,
      py - y
    );

    if (
      !nearest ||
      distance < nearest.distance
    ) {
      nearest = {
        x,
        y,
        distance,
        type: object.type,
        object,
      };
    }
  };

  /* =========================
     TEST SEGMENT
  ========================= */

  const testSegment = (
    x1,
    y1,
    x2,
    y2,
    object
  ) => {
    measureSegments.push({
      x1,
      y1,
      x2,
      y2,
      object,
    });

    const dx = x2 - x1;
    const dy = y2 - y1;

    const lengthSquared = dx * dx + dy * dy;

    let t = 0;

    if (lengthSquared > 0) {
      t = Math.max(
        0,
        Math.min(
          1,
          (
            (px - x1) * dx +
            (py - y1) * dy
          ) / lengthSquared
        )
      );
    }

    considerPoint(
      x1 + t * dx,
      y1 + t * dy,
      object
    );
  };

  /* =========================
     SCAN ALL VISIBLE OBJECTS
  ========================= */

  objects.forEach((object) => {
    if (!isVisibleObject(object)) {
      return;
    }

    /* LINE / POLYLINE */

    if (
      (
        object.type === "line" ||
        object.type === "polyline"
      ) &&
      Array.isArray(object.points) &&
      object.points.length >= 4
    ) {
      const points = object.points;

      for (
        let i = 0;
        i < points.length - 2;
        i += 2
      ) {
        testSegment(
          points[i],
          points[i + 1],
          points[i + 2],
          points[i + 3],
          object
        );
      }

      /* CLOSED POLYLINE EDGE */

      if (isClosedPolyline(object)) {
        const firstX = points[0];
        const firstY = points[1];
        const lastX = points[points.length - 2];
        const lastY = points[points.length - 1];

        if (
          Math.hypot(
            firstX - lastX,
            firstY - lastY
          ) > 0.001
        ) {
          testSegment(
            lastX,
            lastY,
            firstX,
            firstY,
            object
          );
        }
      }

      return;
    }

    /* CIRCLE */

    if (
      object.type === "circle" &&
      Number(object.radius) > 0
    ) {
      const radius = Number(object.radius);
      const steps = 96;

      let previous = {
        x: object.x + radius,
        y: object.y,
      };

      for (let i = 1; i <= steps; i++) {
        const angle = TWO_PI * i / steps;

        const current = {
          x: object.x + Math.cos(angle) * radius,
          y: object.y + Math.sin(angle) * radius,
        };

        testSegment(
          previous.x,
          previous.y,
          current.x,
          current.y,
          object
        );

        previous = current;
      }

      return;
    }
    /* ARC */

    if (
      object.type === "arc" &&
      Number(object.radius) > 0 &&
      Number.isFinite(object.angleStart) &&
      Number.isFinite(object.angleEnd)
    ) {
      const radius = Number(object.radius);
      const sweep =
        object.angleEnd - object.angleStart;

      const absoluteSweep = Math.abs(sweep);

      if (absoluteSweep <= 0.000001) {
        return;
      }

      const steps = Math.max(
        24,
        Math.min(
          120,
          Math.ceil(absoluteSweep * 24)
        )
      );

      let previous = {
        x:
          object.x +
          Math.cos(object.angleStart) * radius,
        y:
          object.y +
          Math.sin(object.angleStart) * radius,
      };

      for (let i = 1; i <= steps; i++) {
        const angle =
          object.angleStart +
          (sweep * i) / steps;

        const current = {
          x:
            object.x +
            Math.cos(angle) * radius,
          y:
            object.y +
            Math.sin(angle) * radius,
        };

        testSegment(
          previous.x,
          previous.y,
          current.x,
          current.y,
          object
        );

        previous = current;
      }

      return;
    }

    /* RECTANGLE / HATCH */

    if (
      object.type === "rectangle" ||
      object.type === "hatch"
    ) {
      const width = Number(object.width) || 0;
      const height = Number(object.height) || 0;

      const rotation =
        (Number(object.rotation) || 0) *
        Math.PI / 180;

      const corners = [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ].map(([localX, localY]) => ({
        x:
          object.x +
          localX * Math.cos(rotation) -
          localY * Math.sin(rotation),
        y:
          object.y +
          localX * Math.sin(rotation) +
          localY * Math.cos(rotation),
      }));

      for (let i = 0; i < 4; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % 4];

        testSegment(
          a.x,
          a.y,
          b.x,
          b.y,
          object
        );
      }

      return;
    }

    /* ELLIPSE */

    if (
      object.type === "ellipse" &&
      Number(object.radiusX) > 0 &&
      Number(object.radiusY) > 0
    ) {
      const rx = Number(object.radiusX);
      const ry = Number(object.radiusY);

      const rotation =
        (Number(object.rotation) || 0) *
        Math.PI / 180;

      const pointAt = (angle) => {
        const localX = rx * Math.cos(angle);
        const localY = ry * Math.sin(angle);

        return {
          x:
            object.x +
            localX * Math.cos(rotation) -
            localY * Math.sin(rotation),
          y:
            object.y +
            localX * Math.sin(rotation) +
            localY * Math.cos(rotation),
        };
      };

      const steps = 96;
      let previous = pointAt(0);

      for (let i = 1; i <= steps; i++) {
        const current = pointAt(
          TWO_PI * i / steps
        );

        testSegment(
          previous.x,
          previous.y,
          current.x,
          current.y,
          object
        );

        previous = current;
      }
    }
  });

  /* QUICK MEASURE — IGNORE DISTANT OBJECTS */

if (
  nearest &&
  nearest.distance * scale > 120
) {
  nearest = null;
}

  /* =========================
     FIND AREA UNDER CURSOR
  ========================= */

  objects.forEach((object) => {
    if (!isVisibleObject(object)) {
      return;
    }

    let inside = false;
    let area = 0;

    /* CIRCLE AREA */

    if (
      object.type === "circle" &&
      Number(object.radius) > 0
    ) {
      inside =
        Math.hypot(
          px - object.x,
          py - object.y
        ) <= object.radius;

      area =
        Math.PI *
        object.radius *
        object.radius;
    }

    /* ELLIPSE AREA */

    else if (
      object.type === "ellipse" &&
      Number(object.radiusX) > 0 &&
      Number(object.radiusY) > 0
    ) {
      const rotation =
        -(Number(object.rotation) || 0) *
        Math.PI / 180;

      const dx = px - object.x;
      const dy = py - object.y;

      const localX =
        dx * Math.cos(rotation) -
        dy * Math.sin(rotation);

      const localY =
        dx * Math.sin(rotation) +
        dy * Math.cos(rotation);

      const rx = Number(object.radiusX);
      const ry = Number(object.radiusY);

      inside =
        (
          localX * localX / (rx * rx) +
          localY * localY / (ry * ry)
        ) <= 1;

      area = Math.PI * rx * ry;
    }

    /* RECTANGLE / HATCH AREA */

    else if (
      object.type === "rectangle" ||
      object.type === "hatch"
    ) {
      const width = Number(object.width) || 0;
      const height = Number(object.height) || 0;

      const rotation =
        -(Number(object.rotation) || 0) *
        Math.PI / 180;

      const dx = px - object.x;
      const dy = py - object.y;

      const localX =
        dx * Math.cos(rotation) -
        dy * Math.sin(rotation);

      const localY =
        dx * Math.sin(rotation) +
        dy * Math.cos(rotation);

      inside =
        localX >= Math.min(0, width) &&
        localX <= Math.max(0, width) &&
        localY >= Math.min(0, height) &&
        localY <= Math.max(0, height);

      area = Math.abs(width * height);
    }

    /* CLOSED POLYLINE AREA */

    else if (
      object.type === "polyline" &&
      isClosedPolyline(object)
    ) {
      const points = object.points;
      const count = Math.floor(points.length / 2);

      let insidePolygon = false;
      let doubledArea = 0;

      for (
        let i = 0, j = count - 1;
        i < count;
        j = i++
      ) {
        const xi = points[i * 2];
        const yi = points[i * 2 + 1];

        const xj = points[j * 2];
        const yj = points[j * 2 + 1];

        if (
          (yi > py) !== (yj > py) &&
          px <
            ((xj - xi) * (py - yi)) /
              (yj - yi) +
            xi
        ) {
          insidePolygon = !insidePolygon;
        }

        doubledArea += xi * yj - xj * yi;
      }

      inside = insidePolygon;
      area = Math.abs(doubledArea) / 2;
    }

    if (
      inside &&
      area > 0 &&
      (
        !quickArea ||
        area < quickArea.area
      )
    ) {
      quickArea = {
        type: object.type,
        area,
        object,
      };
    }
  });


  /* =========================
     EDGE ANGLE
  ========================= */

  let nearestSegment = null;

  const angleObject =
    quickArea?.object || nearest?.object;

  for (const segment of measureSegments) {
    if (
      angleObject &&
      segment.object !== angleObject
    ) {
      continue;
    }

    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;

    const lengthSquared =
      dx * dx + dy * dy;

    if (lengthSquared < 0.000001) {
      continue;
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        (
          (px - segment.x1) * dx +
          (py - segment.y1) * dy
        ) / lengthSquared
      )
    );

    const closestX = segment.x1 + t * dx;
    const closestY = segment.y1 + t * dy;

    const cursorDistance = Math.hypot(
      px - closestX,
      py - closestY
    );

    if (
      !nearestSegment ||
      cursorDistance < nearestSegment.distance
    ) {
      let angle =
        Math.atan2(dy, dx) * 180 / Math.PI;

      if (angle < 0) {
        angle += 360;
      }

      nearestSegment = {
        distance: cursorDistance,
        angle,
      };
    }
  }

  /* HIDE DISTANT EDGE ANGLE */

  if (
    nearestSegment &&
    nearestSegment.distance * scale > 120
  ) {
    nearestSegment = null;
  }

  /* =========================
     GAP BETWEEN OBJECTS
  ========================= */

  let nearestGap = null;

  if (nearest) {
    for (const segment of measureSegments) {
      if (segment.object === nearest.object) {
        continue;
      }

      const dx = segment.x2 - segment.x1;
      const dy = segment.y2 - segment.y1;

      const lengthSquared =
        dx * dx + dy * dy;

      let t = 0;

      if (lengthSquared > 0) {
        t = Math.max(
          0,
          Math.min(
            1,
            (
              (nearest.x - segment.x1) * dx +
              (nearest.y - segment.y1) * dy
            ) / lengthSquared
          )
        );
      }

      const x2 = segment.x1 + t * dx;
      const y2 = segment.y1 + t * dy;

      const distance = Math.hypot(
        nearest.x - x2,
        nearest.y - y2
      );

      if (
        distance > 0.5 / Math.max(scale, 0.01) &&
        distance <= 250 / Math.max(scale, 0.01) &&
        (
          !nearestGap ||
          distance < nearestGap.distance
        )
      ) {
        nearestGap = {
          x1: nearest.x,
          y1: nearest.y,
          x2,
          y2,
          distance,
        };
      }
    }
  }

  /* =========================
     LIVE MEASUREMENT LABEL
  ========================= */

  const edgeText =
    (nearest || quickArea) && nearestSegment
      ? `EDGE ${nearestSegment.angle.toFixed(1)}°`
      : "";

  const mainText = quickArea
    ? `AREA ${formatArea(quickArea.area)}`
    : nearestGap
      ? `GAP ${formatLength(nearestGap.distance)}`
      : nearest
        ? `OFFSET ${formatLength(nearest.distance)}`
        : "No nearby object";

  const metricObject =
    quickArea?.object || nearest?.object;

  const summaryText =
    getObjectSummary(metricObject);

  const firstLine = [
    mainText,
    edgeText,
  ].filter(Boolean).join(" | ");

  const labelText = summaryText
    ? `${firstLine}\n${summaryText}`
    : firstLine;

  /* =========================
     RESPONSIVE CANVAS SIZE
  ========================= */

  const canvasWidth =
    viewportSize.width <= 768
      ? viewportSize.width
      : viewportSize.width - 298;

  const canvasHeight =
    viewportSize.width <= 768
      ? viewportSize.height - 87 - 64
      : viewportSize.height - 87;

   /* =========================
     LABEL SIZE
  ========================= */

  const labelWidthPx = Math.max(
    120,
    Math.min(340, canvasWidth - 12)
  );

  const labelHeightPx = summaryText
    ? (viewportSize.width <= 768 ? 60 : 48)
    : 30;

  const fontPx =
    viewportSize.width <= 768 ? 10 : 12;

  /* =========================
     POINTER SCREEN POSITION
  ========================= */

  const pointerScreenX =
    position.x + px * scale + 12;

  const pointerScreenY =
    position.y + py * scale + 12;

  /* =========================
     KEEP LABEL INSIDE CANVAS
  ========================= */

  const labelScreenX = Math.max(
    4,
    Math.min(
      canvasWidth - labelWidthPx - 4,
      pointerScreenX
    )
  );

  const labelScreenY = Math.max(
    4,
    Math.min(
      canvasHeight - labelHeightPx - 4,
      pointerScreenY
    )
  );

  /* =========================
     SCREEN TO WORLD POSITION
  ========================= */

  const safeScale =
    Math.max(0.001, scale);

  const labelX =
    (labelScreenX - position.x) / safeScale;

  const labelY =
    (labelScreenY - position.y) / safeScale;

  /* =========================
     FINAL RENDER
  ========================= */

  return (
    <>

          {/* =========================
         QUICK MEASURE AREA HIGHLIGHT
      ========================= */}

      {quickArea?.object && (() => {
        const obj = quickArea.object;

        const fillColor = "rgba(0, 229, 255, 0.12)";
        const edgeColor = "#00e5ff";

        /* CIRCLE */
        if (
          obj.type === "circle" &&
          Number(obj.radius) > 0
        ) {
          return (
            <Circle
              x={obj.x}
              y={obj.y}
              radius={obj.radius}
              fill={fillColor}
              stroke={edgeColor}
              strokeWidth={2 / scale}
              listening={false}
            />
          );
        }

        /* ELLIPSE */
        if (
          obj.type === "ellipse" &&
          Number(obj.radiusX) > 0 &&
          Number(obj.radiusY) > 0
        ) {
          return (
            <Ellipse
              x={obj.x}
              y={obj.y}
              radiusX={obj.radiusX}
              radiusY={obj.radiusY}
              rotation={Number(obj.rotation) || 0}
              fill={fillColor}
              stroke={edgeColor}
              strokeWidth={2 / scale}
              listening={false}
            />
          );
        }

        /* RECTANGLE / HATCH */
        if (
          obj.type === "rectangle" ||
          obj.type === "hatch"
        ) {
          const width = Number(obj.width) || 0;
          const height = Number(obj.height) || 0;

          const angle =
            (Number(obj.rotation) || 0) *
            Math.PI / 180;

          const corners = [
            [0, 0],
            [width, 0],
            [width, height],
            [0, height],
          ].map(([x, y]) => ({
            x:
              obj.x +
              x * Math.cos(angle) -
              y * Math.sin(angle),
            y:
              obj.y +
              x * Math.sin(angle) +
              y * Math.cos(angle),
          }));

          return (
            <Line
              points={corners.flatMap((p) => [p.x, p.y])}
              closed
              fill={fillColor}
              stroke={edgeColor}
              strokeWidth={2 / scale}
              lineJoin="round"
              listening={false}
            />
          );
        }

        /* CLOSED POLYLINE */
        if (
          obj.type === "polyline" &&
          Array.isArray(obj.points) &&
          obj.points.length >= 6
        ) {
          return (
            <Line
              points={obj.points}
              closed
              fill={fillColor}
              stroke={edgeColor}
              strokeWidth={2 / scale}
              lineJoin="round"
              listening={false}
            />
          );
        }

        return null;
      })()}
           {/* POINTER TO NEAREST EDGE */}

      {nearest && !nearestGap && (
        <Line
          points={[
            px,
            py,
            nearest.x,
            nearest.y,
          ]}
          stroke="#00e5ff"
          strokeWidth={1.5 / scale}
          dash={[5 / scale, 3 / scale]}
          listening={false}
        />
      )}

      {/* GAP BETWEEN OBJECTS */}

      {nearestGap && (
        <Line
          points={[
            nearestGap.x1,
            nearestGap.y1,
            nearestGap.x2,
            nearestGap.y2,
          ]}
          stroke="#00e5ff"
          strokeWidth={1.5 / scale}
          dash={[5 / scale, 3 / scale]}
          listening={false}
        />
      )}

      {/* NEAREST POINT */}

      {nearest && (
        <Circle
          x={nearest.x}
          y={nearest.y}
          radius={4 / scale}
          fill="#00e5ff"
          listening={false}
        />
      )}

      {/* SECOND GAP POINT */}

      {nearestGap && (
        <Circle
          x={nearestGap.x2}
          y={nearestGap.y2}
          radius={4 / scale}
          fill="#00e5ff"
          listening={false}
        />
      )}

      {/* LIVE MEASUREMENT LABEL */}

      <Group
        x={labelX}
        y={labelY}
        listening={false}
      >
        <Rect
          width={labelWidthPx / scale}
          height={labelHeightPx / scale}
          fill="#171717"
          stroke="#00e5ff"
          strokeWidth={1 / scale}
          cornerRadius={4 / scale}
          listening={false}
        />

        <Text
          x={7 / scale}
          y={5 / scale}
          width={(labelWidthPx - 14) / scale}
          height={(labelHeightPx - 8) / scale}
          text={labelText}
          fontSize={fontPx / scale}
          lineHeight={1.15}
          wrap="word"
          verticalAlign="middle"
          fill="#ffffff"
          listening={false}
        />
      </Group>
    </>
  );
})()}


{/* =========================
   LINE LIVE PREVIEW
========================= */}

{linePreview &&
  (tool === "line" || tool === "polyline") &&
  !showLineInput && (
    <Line
      points={[
        linePreview.x1,
        linePreview.y1,
        linePreview.x2,
        linePreview.y2,
      ]}
      stroke="#d0d6df"
      strokeWidth={0.9}
      strokeScaleEnabled={false}
      dash={[1 / scale, 3 / scale]}
      lineCap="round"
      listening={false}
    />
)}

{viewportSize.width > 768 &&
  (tool === "line" || tool === "polyline") &&
  linePreview &&
  !showLineInput && (
    <Group
      x={linePreview.x2 + 15}
      y={linePreview.y2 + 20}
    >
      {/* UNDO */}
      <Group
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setLineStart(null);
          setLinePreview(null);
          setPendingLinePoint(null);
          setLineLengthInput("");
          setShowLineInput(false);
          setIsDrawing(false);
        }}
        onTouchStart={(e) => {
          e.cancelBubble = true;

          setLineStart(null);
          setLinePreview(null);
          setPendingLinePoint(null);
          setLineLengthInput("");
          setShowLineInput(false);
          setIsDrawing(false);
        }}
      >
        <Rect
          x={0}
          y={0}
          width={65 / scale}
          height={38 / scale}
          fill="#222"
          stroke="#777"
          strokeWidth={1 / scale}
          cornerRadius={6 / scale}
        />

        <Text
          x={10 / scale}
          y={10 / scale}
          text="Undo"
          fontSize={14 / scale}
          fill="white"
        />
      </Group>

      {/* CLOSE */}
      <Group
        x={75 / scale}
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setLineStart(null);
          setLinePreview(null);
          setPendingLinePoint(null);
          setLineLengthInput("");
          setShowLineInput(false);
          setIsDrawing(false);

          changeTool("select");
        }}
        onTouchStart={(e) => {
          e.cancelBubble = true;

          setLineStart(null);
          setLinePreview(null);
          setPendingLinePoint(null);
          setLineLengthInput("");
          setShowLineInput(false);
          setIsDrawing(false);

          changeTool("select");
        }}
      >
        <Rect
          x={0}
          y={0}
          width={65 / scale}
          height={38 / scale}
          fill="#222"
          stroke="#777"
          strokeWidth={1 / scale}
          cornerRadius={6 / scale}
        />

        <Text
          x={9 / scale}
          y={10 / scale}
          text="Close"
          fontSize={14 / scale}
          fill="white"
        />
      </Group>
    </Group>
  )}

{/* =========================
   AUTOCAD CROSSHAIR
========================= */}

{(
  tool === "line" ||
  tool === "polyline" ||
  tool === "quickMeasure"
) && (
  <>
  {/* =========================
   MOBILE AUTOCAD CROSSHAIR
========================= */}

<Line
  points={[
    mousePosition.x - 32 / scale,
    mousePosition.y,
    mousePosition.x + 32 / scale,
    mousePosition.y,
  ]}
  stroke="#808080"
  strokeWidth={0.5}
  strokeScaleEnabled={false}
  listening={false}
/>

<Line
  points={[
    mousePosition.x,
    mousePosition.y - 32 / scale,
    mousePosition.x,
    mousePosition.y + 32 / scale,
  ]}
  stroke="#808080"
  strokeWidth={0.5}
  strokeScaleEnabled={false}
  listening={false}
/>

    {/* CENTER POINT */}
    <Circle
  x={mousePosition.x}
  y={mousePosition.y}
  radius={2 / scale}
  fill="#00ff66"
  strokeScaleEnabled={false}
  listening={false}
/>

{/* LIVE COORDINATES */}

{(tool === "line" || tool === "polyline") && (
  <Text
    x={mousePosition.x + 12 / scale}
    y={mousePosition.y + 12 / scale}
    text={`X: ${mousePosition.x}  Y: ${mousePosition.y}`}
    fontSize={12 / scale}
    fill="#ffffff"
    listening={false}
  />
)}

{/* =========================
   MOBILE LINE TAP BUTTON
========================= */}

{viewportSize.width <= 768 &&
  tool === "line" &&
  !showLineInput && (
    <Group
      x={mousePosition.x + 28 / scale}
      y={mousePosition.y - 30 / scale}
      onTouchStart={(e) => {
        e.cancelBubble = true;

       const snappedPoint = snapToObject(
  mousePosition.x,
  mousePosition.y
);

const x = snappedPoint.x;
const y = snappedPoint.y;

        /* =========================
           FIRST TAP
        ========================= */

        if (!lineStart) {
          actionStartRef.current = {
            objects: [...objects],
            measurements: [...measurements],
          };

          setLineStart({
            x,
            y,
          });
          setCommandText("Tap");

          setIsDrawing(true);

          setLinePreview({
            x1: x,
            y1: y,
            x2: x,
            y2: y,
          });

          setPendingLinePoint(null);

          setLineLengthInput("");

          setShowLineInput(false);

          return;
        }

        /* =========================
           SECOND TAP
        ========================= */

        let finalX = x;
        let finalY = y;

        /* ORTHO */

        if (orthoEnabled) {
          const orthoPoint =
            applyOrtho(
              lineStart.x,
              lineStart.y,
              finalX,
              finalY
            );

          finalX =
            orthoPoint.x;

          finalY =
            orthoPoint.y;
        }

        /* POLAR */

        if (polarEnabled) {
          const polarPoint =
            applyPolar(
              lineStart.x,
              lineStart.y,
              finalX,
              finalY
            );

          finalX =
            polarPoint.x;

          finalY =
            polarPoint.y;
        }

          /* =========================
     ASK FOR LINE LENGTH
  ========================= */

  const requestedDistance = Math.hypot(
    finalX - lineStart.x,
    finalY - lineStart.y
  );

  if (
    !Number.isFinite(requestedDistance) ||
    requestedDistance <= 0
  ) {
    return;
  }

  let requestedAngle =
    Math.atan2(
      finalY - lineStart.y,
      finalX - lineStart.x
    ) * (180 / Math.PI);

  if (requestedAngle < 0) {
    requestedAngle += 360;
  }

  setPendingLinePoint({
    x: finalX,
    y: finalY,
  });

  setLineLengthInput(
    `${requestedDistance.toFixed(2)}<${requestedAngle.toFixed(1)}`
  );

  setShowLineInput(true);

  return;

        /* =========================
           CREATE LINE
        ========================= */

        const newLine = {
          type: "line",

          points: [
            lineStart.x,
            lineStart.y,
            finalX,
            finalY,
          ],

          rotation: 0,

          color: "#ffffff",

          strokeWidth: 2,

          layerId: activeLayerId,
        };

        const previousObjects =
          [...objects];

        setObjects((prev) => [
          ...prev,
          newLine,
        ]);

        /* =========================
           HISTORY
        ========================= */

        saveHistory(
          previousObjects,
          [...measurements]
        );

        /* =========================
           RESET
        ========================= */

        setLineStart(null);

        setLinePreview(null);

        setPendingLinePoint(null);

        setLineLengthInput("");

        setShowLineInput(false);

        setIsDrawing(false);

        setSnapPoint(null);

        setSnapType("");

        actionStartRef.current = null;
      }}
    >
      <Rect
        width={48 / scale}
        height={30 / scale}
        fill="#111"
        stroke="#777"
        strokeWidth={1 / scale}
        cornerRadius={5 / scale}
      />

      <Text
        x={8 / scale}
        y={7 / scale}
        text="Tap"
        fontSize={14 / scale}
        fill="#ffffff"
        listening={false}
      />
    </Group>
  )}
  </>
)}

{viewportSize.width > 768 &&
  tool === "line" &&
  !showLineInput && (
  <Group
    x={mousePosition.x - 19 / scale}
    y={mousePosition.y - 40 / scale}
    listening={false}

      onMouseDown={(e) => {
  e.cancelBubble = true;

  if (!lineStart) {
    actionStartRef.current = {
      objects: [...objects],
      measurements: [...measurements],
    };

    setLineStart({
      x: mousePosition.x,
      y: mousePosition.y,
    });

    setIsDrawing(true);
    setLinePreview(null);

    return;
  }

  // yahan tumhara existing
  // dx, dy, distance, angle wala code rahega

      const dx =
        linePreview.x2 -
        linePreview.x1;

      const dy =
        linePreview.y2 -
        linePreview.y1;

      const distance =
        Math.hypot(dx, dy);

      let angle =
        Math.atan2(dy, dx) *
        (180 / Math.PI);

      if (angle < 0) {
        angle += 360;
      }

      setPendingLinePoint({
        x: linePreview.x2,
        y: linePreview.y2,
      });

      setLineLengthInput(
        `${distance.toFixed(2)}<${angle.toFixed(1)}`
      );

      setShowLineInput(true);
    }}

    onTouchStart={(e) => {
      e.cancelBubble = true;

  if (!lineStart) {
    actionStartRef.current = {
      objects: [...objects],
      measurements: [...measurements],
    };

    setLineStart({
      x: mousePosition.x,
      y: mousePosition.y,
    });

    setIsDrawing(true);
    setLinePreview(null);

    return;
  }

  // yahan tumhara existing
  // dx, dy, distance, angle wala code rahega

      const dx =
        linePreview.x2 -
        linePreview.x1;

      const dy =
        linePreview.y2 -
        linePreview.y1;

      const distance =
        Math.hypot(dx, dy);

      let angle =
        Math.atan2(dy, dx) *
        (180 / Math.PI);

      if (angle < 0) {
        angle += 360;
      }

      setPendingLinePoint({
        x: linePreview.x2,
        y: linePreview.y2,
      });

      setLineLengthInput(
        `${distance.toFixed(2)}<${angle.toFixed(1)}`
      );

      setShowLineInput(true);
    }}

  >
    <Rect
      width={38 / scale}
      height={22 / scale}
      fill="#111"
      cornerRadius={4 / scale}
    />

    <Text
      x={7 / scale}
      y={4 / scale}
      text="Tap"
      fontSize={14 / scale}
      fill="#ffffff"
      listening={false}
    />
  </Group>
)}

{tool === "line" &&
  linePreview &&
  !showLineInput && (
    <>
      {/* DISTANCE BOX */}
      <Group
        x={
          linePreview.x2 -
          95 / scale
        }
        y={
          linePreview.y2 +
          25 / scale
        }
       onMouseDown={(e) => {
  e.cancelBubble = true;

  const dx =
    linePreview.x2 -
    linePreview.x1;

  const dy =
    linePreview.y2 -
    linePreview.y1;

  const distance =
    Math.hypot(dx, dy);

  let angle =
    Math.atan2(dy, dx) *
    (180 / Math.PI);

  if (angle < 0) {
    angle += 360;
  }

  setPendingLinePoint({
    x: linePreview.x2,
    y: linePreview.y2,
  });

  setLineLengthInput(
    `${distance.toFixed(2)}<${angle.toFixed(1)}`
  );

  setShowLineInput(true);
}}
onTouchStart={(e) => {
  e.cancelBubble = true;

  const dx =
    linePreview.x2 -
    linePreview.x1;

  const dy =
    linePreview.y2 -
    linePreview.y1;

  const distance =
    Math.hypot(dx, dy);

  let angle =
    Math.atan2(dy, dx) *
    (180 / Math.PI);

  if (angle < 0) {
    angle += 360;
  }

  setPendingLinePoint({
    x: linePreview.x2,
    y: linePreview.y2,
  });

  setLineLengthInput(
    `${distance.toFixed(2)}<${angle.toFixed(1)}`
  );

  setShowLineInput(true);
}}

      >
        <Rect
          width={145 / scale}
          height={32 / scale}
          fill="#555"
          cornerRadius={3 / scale}
        />

        <Text
          x={8 / scale}
          y={7 / scale}
          text="⌨"
          fontSize={16 / scale}
          fill="white"
        />

        <Text
          x={32 / scale}
          y={7 / scale}
          text={`${Math.hypot(
            linePreview.x2 -
              linePreview.x1,
            linePreview.y2 -
              linePreview.y1
          ).toFixed(2)}`}
          fontSize={13 / scale}
          fill="white"
        />
      </Group>

      {/* ANGLE BOX */}
      <Group
        x={
          linePreview.x2 +
          20 / scale
        }
        y={
          linePreview.y2 +
          25 / scale
        }
       onMouseDown={(e) => {
  e.cancelBubble = true;

  const dx =
    linePreview.x2 -
    linePreview.x1;

  const dy =
    linePreview.y2 -
    linePreview.y1;

  const distance =
    Math.hypot(dx, dy);

  let angle =
    Math.atan2(dy, dx) *
    (180 / Math.PI);

  if (angle < 0) {
    angle += 360;
  }

  setPendingLinePoint({
    x: linePreview.x2,
    y: linePreview.y2,
  });

  setLineLengthInput(
    `${distance.toFixed(2)}<${angle.toFixed(1)}`
  );

  setShowLineInput(true);
}}
onTouchStart={(e) => {
  e.cancelBubble = true;

  const dx =
    linePreview.x2 -
    linePreview.x1;

  const dy =
    linePreview.y2 -
    linePreview.y1;

  const distance =
    Math.hypot(dx, dy);

  let angle =
    Math.atan2(dy, dx) *
    (180 / Math.PI);

  if (angle < 0) {
    angle += 360;
  }

  setPendingLinePoint({
    x: linePreview.x2,
    y: linePreview.y2,
  });

  setLineLengthInput(
    `${distance.toFixed(2)}<${angle.toFixed(1)}`
  );

  setShowLineInput(true);
}}
      >
        <Rect
          width={70 / scale}
          height={32 / scale}
          fill="#555"
          cornerRadius={3 / scale}
        />

        <Text
          x={7 / scale}
          y={7 / scale}
          text="⌨"
          fontSize={16 / scale}
          fill="white"
        />

        <Text
          x={32 / scale}
          y={7 / scale}
          text={`${(() => {
            let a =
              Math.atan2(
                linePreview.y2 -
                  linePreview.y1,
                linePreview.x2 -
                  linePreview.x1
              ) *
              (180 / Math.PI);

            if (a < 0) {
              a += 360;
            }

            return `${a.toFixed(0)}°`;
          })()}`}
          fontSize={13 / scale}
          fill="white"
        />
      </Group>
    </>
  )}

{(tool === "line" || tool === "polyline") &&
  polarEnabled &&
  lineStart &&
  !showLineInput && (
    <>
      <Line
        points={[
          lineStart.x,
          lineStart.y,
          snapPoint?.x ??
            mousePosition.x,
          snapPoint?.y ??
            mousePosition.y,
        ]}
       stroke="#00ff66"
        strokeWidth={1}
        strokeScaleEnabled={false}
        dash={[8, 6]}
        listening={false}
      />

      <Text
        x={
          (
            lineStart.x +
            (snapPoint?.x ??
              mousePosition.x)
          ) / 2
        }
        y={
          (
            lineStart.y +
            (snapPoint?.y ??
              mousePosition.y)
          ) / 2 -
          18 / scale
        }
        text="POLAR"
        fontSize={12 / scale}
       fill="#00ff66"
        listening={false}
      />
    </>
  )}

{objectSnapTrackingEnabled &&
  snapPoint && (
    <>
      <Line
        points={[
          snapPoint.x - 12 / scale,
          snapPoint.y,
          snapPoint.x + 12 / scale,
          snapPoint.y,
        ]}
        stroke="#00ff66"
        strokeWidth={1 / scale}
        listening={false}
      />

      <Line
        points={[
          snapPoint.x,
          snapPoint.y - 12 / scale,
          snapPoint.x,
          snapPoint.y + 12 / scale,
        ]}
        stroke="#00ff66"
        strokeWidth={1 / scale}
        listening={false}
      />

      <Text
        x={snapPoint.x + 10 / scale}
        y={snapPoint.y - 22 / scale}
        text="TRACK"
        fontSize={11 / scale}
        fill="#00ff66"
        listening={false}
      />
    </>
  )}

  {/* =========================
   SNAP TYPE LABEL
========================= */}

{snapPoint &&
  snapType && (
    <Text
      x={
        snapPoint.x +
        12 / scale
      }
      y={
        snapPoint.y -
        28 / scale
      }
      text={snapType}
      fontSize={12 / scale}
      fontStyle="bold"
      fill="#00ff66"
      listening={false}
    />
  )}

{/* =========================
   LIVE LINE INFO
========================= */}

{viewportSize.width > 768 &&
  dynamicInputEnabled &&
  (tool === "line" || tool === "polyline") &&
  lineStart &&
  linePreview &&
  !showLineInput &&
  (() => {
    const dx =
      linePreview.x2 -
      linePreview.x1;

    const dy =
      linePreview.y2 -
      linePreview.y1;

    const distance =
      Math.hypot(dx, dy);

    let angle =
      Math.atan2(dy, dx) *
      (180 / Math.PI);

    if (angle < 0) {
      angle += 360;
    }

   const boxX =
  linePreview.x2 + 12;

const boxY =
  linePreview.y2 - 35;

    return (
      <Group
        x={boxX}
        y={boxY}
       onMouseDown={(e) => {
  e.cancelBubble = true;

  setPendingLinePoint({
    x: linePreview.x2,
    y: linePreview.y2,
  });

  setLineLengthInput(
    `${distance.toFixed(2)}<${angle.toFixed(1)}`
  );

  setShowLineInput(true);
}}

onTouchStart={(e) => {
  e.cancelBubble = true;

  setPendingLinePoint({
    x: linePreview.x2,
    y: linePreview.y2,
  });

  setLineLengthInput(
    `${distance.toFixed(2)}<${angle.toFixed(1)}`
  );

  setShowLineInput(true);
}}
      >

        {/* BACKGROUND */}
        <Rect
          width={175 / scale}
          height={62 / scale}
          fill="#202020"
          stroke="#777"
          strokeWidth={1 / scale}
          cornerRadius={5 / scale}
        />

        {/* COORDINATES */}
        <Text
          x={8 / scale}
          y={5 / scale}
          text={`X  ${Math.round(linePreview.x2)}   Y  ${Math.round(linePreview.y2)}`}
          fontSize={12 / scale}
          fill="#ffffff"
        />

        {/* LENGTH */}
        <Text
          x={8 / scale}
          y={24 / scale}
          text={`Length   ${distance.toFixed(1)}`}
          fontSize={13 / scale}
          fill="#ffffff"
        />

        {/* ANGLE */}
        <Text
          x={8 / scale}
          y={43 / scale}
          text={`Angle     ${angle.toFixed(1)}°`}
          fontSize={13 / scale}
          fill="#ffffff"
        />

      </Group>
    );
  })()}

{(
  tool === "dimension" ||
  tool === "angularDimension" ||
  tool === "radiusDimension" ||
  tool === "diameterDimension"
) && (
  <>
    <Line
      points={[
        (snapPoint?.x ?? mousePosition.x) - 12,
        snapPoint?.y ?? mousePosition.y,
        (snapPoint?.x ?? mousePosition.x) + 12,
        snapPoint?.y ?? mousePosition.y,
      ]}
      stroke="yellow"
      strokeWidth={2 / scale}
      listening={false}
    />

    <Line
      points={[
        snapPoint?.x ?? mousePosition.x,
        (snapPoint?.y ?? mousePosition.y) - 12,
        snapPoint?.x ?? mousePosition.x,
        (snapPoint?.y ?? mousePosition.y) + 12,
      ]}
      stroke="yellow"
      strokeWidth={2 / scale}
      listening={false}
    />
  </>
)}

{isSelecting && selectionBox && (
  <Rect
    x={Math.min(
      selectionBox.x,
      selectionBox.x + selectionBox.width
    )}
    y={Math.min(
      selectionBox.y,
      selectionBox.y + selectionBox.height
    )}
    width={Math.abs(selectionBox.width)}
    height={Math.abs(selectionBox.height)}
    fill="rgba(0, 120, 215, 0.15)"
    stroke="#0088ff"
    strokeWidth={1 / scale}
    dash={[6, 4]}
    listening={false}
  />
)}

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
                    radius={6 / scale}
                    fill="yellow"
                  />
                )}

                {tool === "angularDimension" &&
  anglePoints.length > 0 && (
    <>
      {anglePoints.map(
        (point, index) => (
          <Circle
            key={`angle-point-${index}`}
            x={point.x}
            y={point.y}
            radius={5 / scale}
            fill="yellow"
          />
        )
      )}
    </>
  )}

  {tool === "angularDimension" &&
  anglePoints.length >= 1 && (
    <>
      {anglePoints.length === 1 && (
        <Line
          points={[
            anglePoints[0].x,
            anglePoints[0].y,
            snapPoint?.x ?? mousePosition.x,
            snapPoint?.y ?? mousePosition.y,
          ]}
          stroke="yellow"
          strokeWidth={2 / scale}
          dash={[6, 4]}
        />
      )}

      {anglePoints.length >= 2 && (
        <>
          <Line
            points={[
              anglePoints[0].x,
              anglePoints[0].y,
              anglePoints[1].x,
              anglePoints[1].y,
            ]}
            stroke="yellow"
            strokeWidth={2 / scale}
          />

          <Line
            points={[
              anglePoints[0].x,
              anglePoints[0].y,
              snapPoint?.x ?? mousePosition.x,
              snapPoint?.y ?? mousePosition.y,
            ]}
            stroke="yellow"
            strokeWidth={2 / scale}
            dash={[6, 4]}
          />
        </>
      )}
    </>
  )}

  {tool === "angularDimension" &&
  anglePoints.length >= 2 && (
    (() => {
      const vertex =
        anglePoints[0];

      const p1 =
        anglePoints[1];

      const p2 = {
        x:
          snapPoint?.x ??
          mousePosition.x,
        y:
          snapPoint?.y ??
          mousePosition.y,
      };

      let startAngle =
        Math.atan2(
          p1.y - vertex.y,
          p1.x - vertex.x
        ) *
        (180 / Math.PI);

      let endAngle =
        Math.atan2(
          p2.y - vertex.y,
          p2.x - vertex.x
        ) *
        (180 / Math.PI);

      let arcAngle =
        (endAngle -
          startAngle +
          360) %
        360;

      if (arcAngle > 180) {
        const temp = startAngle;
        startAngle = endAngle;
        endAngle = temp;

        arcAngle =
          360 - arcAngle;
      }

      return (
       
   <Arc
  x={vertex.x}
  y={vertex.y}
  innerRadius={45}
  outerRadius={45}
  angle={arcAngle}
  rotation={startAngle}
  stroke="yellow"
 strokeWidth={2 / scale}
/>
 
      );
    })()
  )}

  {tool === "angularDimension" &&
  anglePoints.length >= 2 && (
    (() => {
      const vertex =
        anglePoints[0];

      const p1 =
        anglePoints[1];

      const p2 = {
        x:
          snapPoint?.x ??
          mousePosition.x,
        y:
          snapPoint?.y ??
          mousePosition.y,
      };

      const a1 =
        Math.atan2(
          p1.y - vertex.y,
          p1.x - vertex.x
        );

      const a2 =
        Math.atan2(
          p2.y - vertex.y,
          p2.x - vertex.x
        );

      let degrees =
        ((a2 - a1) *
          180) /
        Math.PI;

      degrees =
        (degrees + 360) %
        360;

      if (degrees > 180) {
        degrees =
          360 - degrees;
      }

      const midAngle =
        a1 +
        (degrees *
          Math.PI) /
          180 /
          2;

      const textRadius = 65;

      const textX =
        vertex.x +
        Math.cos(midAngle) *
          textRadius;

      const textY =
        vertex.y +
        Math.sin(midAngle) *
          textRadius;

      return (
        <Text
          x={textX - 25}
          y={textY - 10}
          text={`${degrees.toFixed(2)}°`}
         fontSize={16 / scale}
          fill="yellow"
        />
      );
    })()
  )}

        {/* MEASUREMENTS */}

{measurements.map(
  (
    measurement,
    index
  ) => {

/* =========================
   ANGULAR DIMENSION
========================= */

if (
  measurement.type ===
  "angularDimension"
) {
  const vertexX =
    measurement.x1;

  const vertexY =
    measurement.y1;

  const dx1 =
    measurement.x2 -
    vertexX;

  const dy1 =
    measurement.y2 -
    vertexY;

  const dx2 =
    measurement.x3 -
    vertexX;

  const dy2 =
    measurement.y3 -
    vertexY;

  let startAngle =
    Math.atan2(
      dy1,
      dx1
    ) *
    (180 / Math.PI);

  let endAngle =
    Math.atan2(
      dy2,
      dx2
    ) *
    (180 / Math.PI);

  let arcAngle =
    (
      endAngle -
      startAngle +
      360
    ) % 360;

  if (
    arcAngle > 180
  ) {
    const temp =
      startAngle;

    startAngle =
      endAngle;

    endAngle =
      temp;

    arcAngle =
      360 -
      arcAngle;
  }

  const radius = 45;

  const startRad =
    startAngle *
    (Math.PI / 180);

  const endRad =
    (
      startAngle +
      arcAngle
    ) *
    (Math.PI / 180);

  const midRad =
    (
      startAngle +
      arcAngle / 2
    ) *
    (Math.PI / 180);

  const arcStartX =
    vertexX +
    Math.cos(startRad) *
    radius;

  const arcStartY =
    vertexY +
    Math.sin(startRad) *
    radius;

  const arcEndX =
    vertexX +
    Math.cos(endRad) *
    radius;

  const arcEndY =
    vertexY +
    Math.sin(endRad) *
    radius;

  const arrowSize = 10;

  const arrowAngle =
    Math.PI / 6;

  const startArrow1 = {
    x:
      arcStartX +
      Math.cos(
        startRad +
        arrowAngle
      ) *
      arrowSize,

    y:
      arcStartY +
      Math.sin(
        startRad +
        arrowAngle
      ) *
      arrowSize,
  };

  const startArrow2 = {
    x:
      arcStartX +
      Math.cos(
        startRad -
        arrowAngle
      ) *
      arrowSize,

    y:
      arcStartY +
      Math.sin(
        startRad -
        arrowAngle
      ) *
      arrowSize,
  };

  const endArrow1 = {
    x:
      arcEndX -
      Math.cos(
        endRad +
        arrowAngle
      ) *
      arrowSize,

    y:
      arcEndY -
      Math.sin(
        endRad +
        arrowAngle
      ) *
      arrowSize,
  };

  const endArrow2 = {
    x:
      arcEndX -
      Math.cos(
        endRad -
        arrowAngle
      ) *
      arrowSize,

    y:
      arcEndY -
      Math.sin(
        endRad -
        arrowAngle
      ) *
      arrowSize,
  };

  const textRadius =
    radius + 20;

  const textX =
    vertexX +
    Math.cos(midRad) *
    textRadius;

  const textY =
    vertexY +
    Math.sin(midRad) *
    textRadius;

  const angularSelected =
    selectedMeasurementIndex ===
    index;

  return (
    <React.Fragment
      key={
        `measurement-${index}`
      }
    >

      {/* FIRST ARM */}

      <Line
        points={[
          vertexX,
          vertexY,
          measurement.x2,
          measurement.y2,
        ]}
        stroke="yellow"
        strokeWidth={
  angularSelected
    ? 4 / scale
    : 2 / scale
}
        hitStrokeWidth={15}
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

      {/* SECOND ARM */}

      <Line
        points={[
          vertexX,
          vertexY,
          measurement.x3,
          measurement.y3,
        ]}
        stroke="yellow"
        strokeWidth={
  angularSelected
    ? 4 / scale
    : 2 / scale
}
        hitStrokeWidth={15}
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

      {/* ARC */}

      <Arc
        x={vertexX}
        y={vertexY}
        innerRadius={radius}
        outerRadius={radius}
        angle={arcAngle}
        rotation={startAngle}
        stroke="yellow"
        strokeWidth={
  angularSelected
    ? 4 / scale
    : 2 / scale
}
        hitStrokeWidth={20}
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

    {/* START ARROW */}

<Line
  points={[
    arcStartX,
    arcStartY,
    startArrow1.x,
    startArrow1.y,
  ]}
  stroke="yellow"
  strokeWidth={2 / scale}
/>

<Line
  points={[
    arcStartX,
    arcStartY,
    startArrow2.x,
    startArrow2.y,
  ]}
  stroke="yellow"
  strokeWidth={2 / scale}
/>

{/* END ARROW */}

<Line
  points={[
    arcEndX,
    arcEndY,
    endArrow1.x,
    endArrow1.y,
  ]}
  stroke="yellow"
  strokeWidth={2 / scale}
/>

<Line
  points={[
    arcEndX,
    arcEndY,
    endArrow2.x,
    endArrow2.y,
  ]}
  stroke="yellow"
  strokeWidth={2 / scale}
/>

      {/* VERTEX */}

      <Circle
        x={vertexX}
        y={vertexY}
       radius={
  angularSelected
    ? 6 / scale
    : 4 / scale
}
        fill="yellow"
      />

      {/* POINT 1 */}

      <Circle
        x={measurement.x2}
        y={measurement.y2}
        radius={
  angularSelected
    ? 6 / scale
    : 4 / scale
}

        fill="yellow"
      />

      {/* POINT 2 */}

      <Circle
        x={measurement.x3}
        y={measurement.y3}
        radius={
  angularSelected
    ? 6 / scale
    : 4 / scale
}

        fill="yellow"
      />

      {/* ANGLE TEXT */}

      <Text
        x={textX - 25}
        y={textY - 10}
        text={
          `${measurement.angle}°`
        }
        fontSize={16 / scale}
        fill={
          angularSelected
            ? "white"
            : "yellow"
        }
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

    </React.Fragment>
  );
}

    /* =========================
   RADIUS DIMENSION
========================= */

if (
  measurement.type ===
  "radiusDimension"
) {
  const centerX =
    measurement.x1;

  const centerY =
    measurement.y1;

  const edgeX =
    measurement.x2;

  const edgeY =
    measurement.y2;

  const dx =
    edgeX - centerX;

  const dy =
    edgeY - centerY;

  const lineAngle =
    Math.atan2(
      dy,
      dx
    );

  const midX =
    (centerX + edgeX) / 2;

  const midY =
    (centerY + edgeY) / 2;

  const textOffset = 18;

  const textX =
    midX +
    Math.cos(
      lineAngle +
        Math.PI / 2
    ) *
      textOffset;

  const textY =
    midY +
    Math.sin(
      lineAngle +
        Math.PI / 2
    ) *
      textOffset;

  const radiusSelected =
    selectedMeasurementIndex ===
    index;

  const arrowSize = 10;

  const arrowAngle =
    Math.PI / 6;

  const arrow1 = {
    x:
      edgeX -
      Math.cos(
        lineAngle -
          arrowAngle
      ) *
        arrowSize,

    y:
      edgeY -
      Math.sin(
        lineAngle -
          arrowAngle
      ) *
        arrowSize,
  };

  const arrow2 = {
    x:
      edgeX -
      Math.cos(
        lineAngle +
          arrowAngle
      ) *
        arrowSize,

    y:
      edgeY -
      Math.sin(
        lineAngle +
          arrowAngle
      ) *
        arrowSize,
  };

  return (
    <React.Fragment
      key={
        `measurement-${index}`
      }
    >

      {/* RADIUS LINE */}

      <Line
        points={[
          centerX,
          centerY,
          edgeX,
          edgeY,
        ]}
        stroke="yellow"
        strokeWidth={
  radiusSelected
    ? 4 / scale
    : 2 / scale
}
        hitStrokeWidth={15}
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

      {/* ARROW */}

      <Line
        points={[
          edgeX,
          edgeY,
          arrow1.x,
          arrow1.y,
        ]}
        stroke="yellow"
       strokeWidth={
  radiusSelected
    ? 3 / scale
    : 2 / scale
}
        hitStrokeWidth={15}
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

      <Line
        points={[
          edgeX,
          edgeY,
          arrow2.x,
          arrow2.y,
        ]}
        stroke="yellow"
       strokeWidth={
  radiusSelected
    ? 3 / scale
    : 2 / scale
}
        hitStrokeWidth={15}
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

      {/* CENTER */}

      <Circle
        x={centerX}
        y={centerY}
        radius={
          
  radiusSelected
    ? 6 / scale
    : 4 / scale
}
        fill="yellow"
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

      {/* EDGE POINT */}

      <Circle
        x={edgeX}
        y={edgeY}
        radius={
  radiusSelected
    ? 6 / scale
    : 4 / scale
}


        fill="yellow"
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

      {/* RADIUS TEXT */}

      <Text
        x={textX - 25}
        y={textY - 10}
        text={`R ${measurement.radius}`}
        fontSize={16 / scale}



        fill={
          radiusSelected
            ? "white"
            : "yellow"
        }
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

    </React.Fragment>
  );
}

/* =========================
   DIAMETER DIMENSION
========================= */

if (
  measurement.type ===
  "diameterDimension"
) {
  const centerX =
    measurement.x1;

  const centerY =
    measurement.y1;

  const point1X =
    measurement.x2;

  const point1Y =
    measurement.y2;

  const point2X =
    measurement.x3;

  const point2Y =
    measurement.y3;

  const diameterSelected =
    selectedMeasurementIndex ===
    index;

  const midX =
    (point1X + point2X) / 2;

  const midY =
    (point1Y + point2Y) / 2;

  const lineAngle =
    Math.atan2(
      point1Y - point2Y,
      point1X - point2X
    );

  const arrowSize = 10;
  const arrowAngle =
    Math.PI / 6;

  const arrow1 = {
    x:
      point1X -
      Math.cos(
        lineAngle +
        arrowAngle
      ) *
        arrowSize,

    y:
      point1Y -
      Math.sin(
        lineAngle +
        arrowAngle
      ) *
        arrowSize,
  };

  const arrow2 = {
    x:
      point1X -
      Math.cos(
        lineAngle -
        arrowAngle
      ) *
        arrowSize,

    y:
      point1Y -
      Math.sin(
        lineAngle -
        arrowAngle
      ) *
        arrowSize,
  };

  const arrow3 = {
    x:
      point2X +
      Math.cos(
        lineAngle +
        arrowAngle
      ) *
        arrowSize,

    y:
      point2Y +
      Math.sin(
        lineAngle +
        arrowAngle
      ) *
        arrowSize,
  };

  const arrow4 = {
    x:
      point2X +
      Math.cos(
        lineAngle -
        arrowAngle
      ) *
        arrowSize,

    y:
      point2Y +
      Math.sin(
        lineAngle -
        arrowAngle
      ) *
        arrowSize,
  };

  const textOffset = 18;

  const textX =
    midX +
    Math.cos(
      lineAngle -
      Math.PI / 2
    ) *
      textOffset;

  const textY =
    midY +
    Math.sin(
      lineAngle -
      Math.PI / 2
    ) *
      textOffset;

  return (
    <React.Fragment
      key={
        `measurement-${index}`
      }
    >

      {/* DIAMETER LINE */}

      <Line
        points={[
          point1X,
          point1Y,
          point2X,
          point2Y,
        ]}
        stroke="yellow"
       strokeWidth={
  diameterSelected
    ? 4 / scale
    : 2 / scale
}

        hitStrokeWidth={15}
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

      {/* ARROW 1 */}

      <Line
        points={[
          point1X,
          point1Y,
          arrow1.x,
          arrow1.y,
        ]}
        stroke="yellow"
        strokeWidth={2 / scale}
      />

      <Line
        points={[
          point1X,
          point1Y,
          arrow2.x,
          arrow2.y,
        ]}
        stroke="yellow"
        strokeWidth={2 / scale}


      />

      {/* ARROW 2 */}

      <Line
        points={[
          point2X,
          point2Y,
          arrow3.x,
          arrow3.y,
        ]}
        stroke="yellow"
        strokeWidth={2 / scale}
      />

      <Line
        points={[
          point2X,
          point2Y,
          arrow4.x,
          arrow4.y,
        ]}
        stroke="yellow"
       strokeWidth={2 / scale}
      />

      {/* CENTER */}

      <Circle
        x={centerX}
        y={centerY}
        radius={
  diameterSelected
    ? 6 / scale
    : 4 / scale
}
        fill="yellow"
      />

      {/* DIAMETER TEXT */}

      <Text
        x={
          textX - 30
        }
        y={
          textY - 10
        }
        text={
          `⌀ ${measurement.diameter}`
        }
        fontSize={16 / scale}

        fill={
          diameterSelected
            ? "white"
            : "yellow"
        }
        onMouseDown={(e) => {
          e.cancelBubble = true;

          setSelectedMeasurementIndex(
            index
          );
        }}
      />

    </React.Fragment>
  );
}

    /* =========================
       NORMAL MEASURE / DIMENSION
    ========================= */

    const midX =
      (
        measurement.x1 +
        measurement.x2
      ) / 2;

    const midY =
      (
        measurement.y1 +
        measurement.y2
      ) / 2;

    const dx =
      measurement.x2 -
      measurement.x1;

    const dy =
      measurement.y2 -
      measurement.y1;

    const lineAngle =
      Math.atan2(
        dy,
        dx
      );

    const extensionSize =
      25;

    const perpX =
      -Math.sin(
        lineAngle
      ) *
      extensionSize;

    const perpY =
      Math.cos(
        lineAngle
      ) *
      extensionSize;

    const dimX1 =
      measurement.x1 +
      perpX;

    const dimY1 =
      measurement.y1 +
      perpY;

    const dimX2 =
      measurement.x2 +
      perpX;

    const dimY2 =
      measurement.y2 +
      perpY;

    const dimensionSelected =
      selectedMeasurementIndex ===
      index;

    return (
      <React.Fragment
        key={
          `measurement-${index}`
        }
      >

        {/* MEASURE / DIMENSION LINE */}

        <Line
          points={[
            measurement.type ===
            "dimension"
              ? dimX1
              : measurement.x1,

            measurement.type ===
            "dimension"
              ? dimY1
              : measurement.y1,

            measurement.type ===
            "dimension"
              ? dimX2
              : measurement.x2,

            measurement.type ===
            "dimension"
              ? dimY2
              : measurement.y2,
          ]}
          stroke={
            measurement.type ===
            "dimension"
              ? "yellow"
              : "cyan"
          }
          strokeWidth={
  dimensionSelected
    ? 4 / scale
    : 2 / scale
}
          dash={
            measurement.type ===
            "dimension"
              ? []
              : [8, 5]
          }
          hitStrokeWidth={15}
          onMouseDown={(e) => {
            e.cancelBubble = true;

            setSelectedMeasurementIndex(
              index
            );
          }}
        />

        {/* DIMENSION EXTENSIONS */}

        {measurement.type ===
          "dimension" && (
          <>
            <Line
              points={[
                measurement.x1,
                measurement.y1,
                dimX1,
                dimY1,
              ]}
              stroke="yellow"
              strokeWidth={1 / scale}
              onMouseDown={(e) => {
                e.cancelBubble = true;

                setSelectedMeasurementIndex(
                  index
                );
              }}
            />

            <Line
              points={[
                measurement.x2,
                measurement.y2,
                dimX2,
                dimY2,
              ]}
              stroke="yellow"
              strokeWidth={1 / scale}


              onMouseDown={(e) => {
                e.cancelBubble = true;

                setSelectedMeasurementIndex(
                  index
                );
              }}
            />
          </>
        )}

        {/* ENDPOINTS */}

        <Circle
          x={
            measurement.x1
          }
          y={
            measurement.y1
          }
          radius={4 / scale}
          fill={
            measurement.type ===
            "dimension"
              ? "yellow"
              : "cyan"
          }
          onMouseDown={(e) => {
            e.cancelBubble = true;

            setSelectedMeasurementIndex(
              index
            );
          }}
        />

        <Circle
          x={
            measurement.x2
          }
          y={
            measurement.y2
          }
          radius={4 / scale}
          fill={
            measurement.type ===
            "dimension"
              ? "yellow"
              : "cyan"
          }
          onMouseDown={(e) => {
            e.cancelBubble = true;

            setSelectedMeasurementIndex(
              index
            );
          }}
        />

        {/* DISTANCE TEXT */}

        <Text
          x={midX}
          y={
            midY -
            25
          }
          text={
            measurement.type ===
            "dimension"
              ? `${measurement.distance}`
              : `${measurement.distance} units`
          }
          fontSize={16 / scale}
          fill={
            measurement.type ===
            "dimension"
              ? "yellow"
              : "cyan"
          }
          onMouseDown={(e) => {
            e.cancelBubble = true;

            setSelectedMeasurementIndex(
              index
            );
          }}
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

  /* =========================
   HIDDEN OBJECT
========================= */

if (object?.hidden) {
  return null;
}

  const selected =
    selectedIndex === index ||
    selectedIndexes.includes(index);
  
  const joinSelected =
  tool === "join" &&
  selectedIndexes.includes(index);

  if (
    !selected &&
    !isObjectVisible(object)
  ) {
    return null;
  }


const commonProps = {
  
  id: `object-${index}`,

  draggable: false,

onMouseDown: (event) => {
  if (tool === "arc") {
    return;
  }

  if (
    tool === "line" ||
    tool === "polyline"
  ) {
    return;
  }

  if (
    tool === "area" ||
    tool === "volume"
  ) {
    return;
  }

  event.cancelBubble = true;
  if (
  object.locked &&
  tool !== "select"
) {
  window.alert(
    "This object is locked."
  );
  return;
}

  if (tool === "select") {
  selectObject(
    index,
    event
  );

  return;
}

if (tool === "move") {
  startMove(
    index,
    event
  );

  return;
}

  if (
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
    tool === "break" ||
    tool === "join"
  ) {
    selectObject(
      index,
      event
    );
  }
},
}

/* =========================
   OFFSET LIVE PREVIEW
========================= */

{offsetPreview &&
  offsetPreview.index !== null &&
  objects[offsetPreview.index] && (
    <Group
      opacity={0.45}
      listening={false}
    >
      {(() => {
        const original =
          objects[offsetPreview.index];

        const distance =
          Math.abs(
            Number(
              offsetPreview.distance || 0
            )
          );

        const sign =
          offsetPreview.sign === -1
            ? -1
            : 1;

        /* =========================
           LINE
        ========================= */

        if (
          original.type === "line" &&
          original.points?.length >= 4
        ) {
          const [
            x1,
            y1,
            x2,
            y2,
          ] = original.points;

          const dx =
            x2 - x1;

          const dy =
            y2 - y1;

          const length =
            Math.hypot(
              dx,
              dy
            );

          if (
            !Number.isFinite(
              length
            ) ||
            length <= 0
          ) {
            return null;
          }

          const nx =
            (-dy / length) *
            sign;

          const ny =
            (dx / length) *
            sign;

          return (
            <Line
              points={[
                x1 +
                  nx * distance,

                y1 +
                  ny * distance,

                x2 +
                  nx * distance,

                y2 +
                  ny * distance,
              ]}
              stroke="#00ff00"
              strokeWidth={
                2 / scale
              }
              dash={[
                8 / scale,
                6 / scale,
              ]}
            />
          );
        }

        /* =========================
           CIRCLE
        ========================= */

        if (
          original.type === "circle"
        ) {
          const radius =
            Number(
              original.radius || 0
            );

          const newRadius =
            radius +
            distance * sign;

          if (
            !Number.isFinite(
              newRadius
            ) ||
            newRadius <= 0
          ) {
            return null;
          }

          return (
            <Circle
              x={original.x}
              y={original.y}
              radius={newRadius}
              stroke="#00ff00"
              strokeWidth={
                2 / scale
              }
              dash={[
                8 / scale,
                6 / scale,
              ]}
            />
          );
       }

        /* =========================
           ARC
        ========================= */

        if (
          original.type === "arc"
        ) {
          const radius =
            Number(
              original.radius || 0
            );

          const newRadius =
            radius +
            distance * sign;

          if (
            !Number.isFinite(
              newRadius
            ) ||
            newRadius <= 0
          ) {
            return null;
          }

          return (
            <Arc
              x={original.x}
              y={original.y}
              innerRadius={0}
              outerRadius={newRadius}
              angle={
                original.angle ||
                360
              }
              rotation={
                original.rotation ||
                0
              }
              stroke="#00ff00"
              strokeWidth={
                2 / scale
              }
              dash={[
                8 / scale,
                6 / scale,
              ]}
            />
          );
        }

        /* =========================
           RECTANGLE
        ========================= */

        if (
          original.type ===
          "rectangle"
        ) {
          const width =
            Math.abs(
              Number(
                original.width || 0
              )
            );

          const height =
            Math.abs(
              Number(
                original.height || 0
              )
            );

          const newWidth =
            width +
            distance * 2 * sign;

          const newHeight =
            height +
            distance * 2 * sign;

          if (
            newWidth <= 0 ||
            newHeight <= 0
          ) {
            return null;
          }

          return (
            <Rect
              x={
                original.x -
                distance * sign
              }
              y={
                original.y -
                distance * sign
              }
              width={newWidth}
              height={newHeight}
              stroke="#00ff00"
              strokeWidth={
                2 / scale
              }
              dash={[
                8 / scale,
                6 / scale,
              ]}
              fillEnabled={false}
            />
          );
        }

        /* =========================
           HATCH
        ========================= */

        if (
          original.type ===
          "hatch"
        ) {
          const width =
            Math.abs(
              Number(
                original.width || 0
              )
            );

          const height =
            Math.abs(
              Number(
                original.height || 0
              )
            );

          const newWidth =
            width +
            distance * 2 * sign;

          const newHeight =
            height +
            distance * 2 * sign;

          if (
            newWidth <= 0 ||
            newHeight <= 0
          ) {
            return null;
          }

          return (
            <Rect
              x={
                original.x -
                distance * sign
              }
              y={
                original.y -
                distance * sign
              }
              width={newWidth}
              height={newHeight}
              stroke="#00ff00"
              strokeWidth={
                2 / scale
              }
              dash={[
                8 / scale,
                6 / scale,
              ]}
              fillEnabled={false}
            />
          );
        }

        return null;
      })()}
    </Group>
  )}

/* =========================
   LINE
========================= */

if (
  object.type === "line"
) {
  return (
    <React.Fragment key={index}>

    <Line
  {...commonProps}
  points={object.points}
  stroke={
    joinSelected
      ? "#00ff66"
      : selected
        ? "#00aaff"
        : object.color ||
          "#ffffff"
  }
strokeWidth={
  joinSelected
    ? 1.2
    : selected
      ? 1.1
      : 0.9
}
strokeScaleEnabled={false}
  hitStrokeWidth={
    tool === "join"
      ? 40
      : 25
  }
  rotation={
    object.rotation || 0
  }
/>

      {/* =========================
          LINE GRIPS
      ========================= */}

      {selectedIndex === index && (
        <>
          {/* START GRIP */}

          <Circle
            x={object.points[0]}
            y={object.points[1]}
            radius={7}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
            draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragStart={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) => {
              handleLineGripDragEnd(
                index,
                0,
                e
              );
            }}
          />

          {/* END GRIP */}

          <Circle
            x={object.points[2]}
            y={object.points[3]}
            radius={7}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
            draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragStart={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) => {
              handleLineGripDragEnd(
                index,
                1,
                e
              );
            }}
          />
        </>
      )}
    </React.Fragment>
  );
}

/* POINT */

if (
  object.type ===
  "point"
) {
  return (
    <React.Fragment key={index}>
      <Circle
        {...commonProps}
        x={object.x}
        y={object.y}
        radius={
          (object.radius || 4) /
          scale
        }
        fill={
          object.color ||
          "#ffffff"
        }
        stroke={
          selectedIndex === index
            ? "#00aaff"
            : undefined
        }
        strokeWidth={
          selectedIndex === index
            ? 2 / scale
            : 0
        }
      />
    </React.Fragment>
  );
}

/* CIRCLE */

if (
  object.type ===
  "circle"
) {
  return (
    <React.Fragment key={index}>

  {object.trimStartAngle !== undefined &&
object.trimEndAngle !== undefined ? (
  <Arc
    {...commonProps}
    x={object.x}
    y={object.y}
    innerRadius={object.radius}
    outerRadius={object.radius}
   angle={
  object.trimEnabled
    ? (
        (
          object.trimEndAngle -
          object.trimStartAngle +
          Math.PI * 2
        ) %
          (Math.PI * 2)
      ) *
      (180 / Math.PI)
    : 360
}
rotation={
  object.trimEnabled
    ? (object.rotation || 0) +
      object.trimStartAngle *
        (180 / Math.PI)
    : object.rotation || 0
}
  strokeWidth={
  Math.max(
    2,
    (
      joinSelected
        ? 4
        : selectedIndex === index
          ? 4
          : (object.strokeWidth || 2)
    ) / scale
  )
}

  />
) : (
  <Circle
  {...commonProps}
  x={object.x}
  y={object.y}
  radius={object.radius}
  stroke={
    joinSelected
      ? "#00ff66"
      : selectedIndex === index
        ? "yellow"
        : object.color || "#ffffff"
  }
  strokeWidth={
    Math.max(
      2,
      (
        joinSelected
          ? 4
          : selectedIndex === index
            ? 4
            : (object.strokeWidth || 2)
      ) / scale
    )
  }
  hitStrokeWidth={
    tool === "join"
      ? 40
      : 20
  }
  rotation={
    object.rotation || 0
  }
/>
)}


   {/* =========================
   CIRCLE GRIPS — TRIMMED ARC
========================= */}

{selectedIndex === index && (
  <>
    {/* CENTER GRIP */}
    <Circle
      x={object.x}
      y={object.y}
      radius={6 / scale}
      fill="#00aaff"
      stroke="white"
      strokeWidth={2 / scale}
      draggable={tool === "move"}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleCircleGripDragEnd(
          index,
          "center",
          e
        )
      }
    />

    {/* RADIUS GRIP */}
    <Circle
      x={
        object.x +
        object.radius *
          Math.cos(
            object.trimEndAngle !== undefined
              ? object.trimEndAngle
              : 0
          )
      }
      y={
        object.y +
        object.radius *
          Math.sin(
            object.trimEndAngle !== undefined
              ? object.trimEndAngle
              : 0
          )
      }
      radius={6 / scale}
      fill="#00aaff"
      stroke="white"
      strokeWidth={2 / scale}
     draggable={tool === "move"}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleCircleGripDragEnd(
          index,
          "radius",
          e
        )
      }
    />
  </>
)}

  </React.Fragment>
  );
}

{/* TRIM ANGLE GRIP */}

{object.trimEnabled && (
  <>
    {/* START ANGLE GRIP */}
    <Circle
      x={
        object.x +
        object.radius *
          Math.cos(object.trimStartAngle)
      }
      y={
        object.y +
        object.radius *
          Math.sin(object.trimStartAngle)
      }
      radius={6 / scale}
      fill="#ff9900"
      stroke="white"
      strokeWidth={2 / scale}
     draggable={tool === "move"}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleCircleGripDragEnd(
          index,
          "trim-start",
          e
        )
      }
    />

    {/* END ANGLE GRIP */}
    <Circle
      x={
        object.x +
        object.radius *
          Math.cos(object.trimEndAngle)
      }
      y={
        object.y +
        object.radius *
          Math.sin(object.trimEndAngle)
      }
      radius={6 / scale}
      fill="#ff9900"
      stroke="white"
      strokeWidth={2 / scale}
     draggable={tool === "move"}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleCircleGripDragEnd(
          index,
          "trim-end",
          e
        )
      }
    />
  </>
)}


/* =========================
   ELLIPSE RENDERING
========================= */

if (object.type === "ellipse") {
  const ellipseRotation =
    ((Number(object.rotation) || 0) * Math.PI) / 180;

  const radiusX = Math.abs(Number(object.radiusX) || 0);
  const radiusY = Math.abs(Number(object.radiusY) || 0);

  return (
    <React.Fragment key={index}>
      <Ellipse
        {...commonProps}
        x={object.x}
        y={object.y}
        radiusX={radiusX}
        radiusY={radiusY}
        rotation={object.rotation || 0}
        stroke={
          selectedIndex === index
            ? "yellow"
            : object.color || "#ffffff"
        }
        strokeWidth={
          Math.max(
            2,
            (selectedIndex === index
              ? 4
              : object.strokeWidth || 2) / scale
          )
        }
        hitStrokeWidth={tool === "join" ? 40 : 20}
      />

      {/* ELLIPSE GRIPS */}
      {selectedIndex === index && (
        <>
          {/* CENTER GRIP */}
          <Circle
            x={object.x}
            y={object.y}
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
            draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleEllipseGripDragEnd(index, "center", e)
            }
          />

          {/* HORIZONTAL GRIP */}
          <Circle
            x={
              object.x +
              radiusX * Math.cos(ellipseRotation)
            }
            y={
              object.y +
              radiusX * Math.sin(ellipseRotation)
            }
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
            draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleEllipseGripDragEnd(index, "radiusX", e)
            }
          />

          {/* VERTICAL GRIP */}
          <Circle
            x={
              object.x -
              radiusY * Math.sin(ellipseRotation)
            }
            y={
              object.y +
              radiusY * Math.cos(ellipseRotation)
            }
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
            draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleEllipseGripDragEnd(index, "radiusY", e)
            }
          />
        </>
      )}
    </React.Fragment>
  );
}


/* =========================
   RECTANGLE
========================= */
if (
  object.type === "rectangle"
) {

  return (
    <React.Fragment key={index}>

      <Rect
        {...commonProps}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
       stroke={
  selectedIndex === index
    ? "yellow"
    : object.color ||
      "#ffffff"
}
        strokeWidth={
  selectedIndex === index
    ? 4 / scale
    : (object.strokeWidth || 2) / scale
}
        rotation={
          object.rotation ||
          0
        }
      />

      {/* =========================
          RECTANGLE GRIPS
      ========================= */}

      {selectedIndex === index && (
        <>
          {/* TOP LEFT */}
          <Circle
            x={object.x}
            y={object.y}
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
           draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleRectangleGripDragEnd(
                index,
                "top-left",
                e
              )
            }
          />

          {/* TOP */}
          <Circle
            x={
              object.x +
              object.width / 2
            }
            y={object.y}
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
           draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleRectangleGripDragEnd(
                index,
                "top",
                e
              )
            }
          />

          {/* TOP RIGHT */}
          <Circle
            x={
              object.x +
              object.width
            }
            y={object.y}
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
            draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleRectangleGripDragEnd(
                index,
                "top-right",
                e
              )
            }
          />

          {/* RIGHT */}
          <Circle
            x={
              object.x +
              object.width
            }
            y={
              object.y +
              object.height / 2
            }
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
           draggable={tool === "move"}

            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleRectangleGripDragEnd(
                index,
                "right",
                e
              )
            }
          />

          {/* BOTTOM RIGHT */}
          <Circle
            x={
              object.x +
              object.width
            }
            y={
              object.y +
              object.height
            }
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
           draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleRectangleGripDragEnd(
                index,
                "bottom-right",
                e
              )
            }
          />

          {/* BOTTOM */}
          <Circle
            x={
              object.x +
              object.width / 2
            }
            y={
              object.y +
              object.height
            }
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
            draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleRectangleGripDragEnd(
                index,
                "bottom",
                e
              )
            }
          />

          {/* BOTTOM LEFT */}
          <Circle
            x={object.x}
            y={
              object.y +
              object.height
            }
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
            draggable={tool === "move"}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleRectangleGripDragEnd(
                index,
                "bottom-left",
                e
              )
            }
          />

          {/* LEFT */}
          <Circle
            x={object.x}
            y={
              object.y +
              object.height / 2
            }
            radius={6 / scale}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2 / scale}
           draggable={tool === "move"}
        
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) =>
              handleRectangleGripDragEnd(
                index,
                "left",
                e
              )
            }
          />
        </>
      )}

    </React.Fragment>
  );
}

/* =========================
   HATCH
========================= */
if (
  object.type === "hatch"
) {
  const hatchSpacing =
    Math.max(
      4,
      Number(object.hatchSpacing) || 12
    );

  const hatchAngle =
    Number(object.hatchAngle) || 45;

  const hatchColor =
    object.hatchColor || "#00aaff";

  const hatchLines = [];

  const width =
    Math.abs(Number(object.width) || 0);

  const height =
    Math.abs(Number(object.height) || 0);

  const x =
    Math.min(
      Number(object.x) || 0,
      (Number(object.x) || 0) +
        Number(object.width || 0)
    );

  const y =
    Math.min(
      Number(object.y) || 0,
      (Number(object.y) || 0) +
        Number(object.height || 0)
    );

  const diagonal =
    Math.sqrt(
      width * width +
      height * height
    );

  const count =
    Math.ceil(
      (diagonal * 2) /
        hatchSpacing
    );

  for (
    let i = -count;
    i <= count;
    i++
  ) {
    const offset =
      i * hatchSpacing;

    hatchLines.push(
      <Line
        key={`hatch-${index}-${i}`}
        points={[
          x - diagonal + offset,
          y + diagonal,
          x + diagonal + offset,
          y - diagonal,
        ]}
        stroke={hatchColor}
        strokeWidth={
          (object.strokeWidth || 1) /
          scale
        }
        rotation={hatchAngle}
        listening={false}
      />
    );
  }

  return (
    <React.Fragment key={index}>
      <Rect
        {...commonProps}
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke={
          selectedIndex === index
            ? "yellow"
            : object.color || "#ffffff"
        }
       strokeWidth={
  selectedIndex === index
    ? 4 / scale
    : (object.strokeWidth || 2) / scale
}
        rotation={
          object.rotation || 0
        }
      />

  <Group
  clipFunc={(ctx) => {
    ctx.beginPath();

    // HATCH BOUNDARY
    ctx.rect(
      x,
      y,
      width,
      height
    );

    // HATCH TRIM
    if (
      object.trimEnabled &&
      object.trimStartPoint &&
      object.trimEndPoint
    ) {
      const start = object.trimStartPoint;
      const end = object.trimEndPoint;

      const dx = end.x - start.x;
      const dy = end.y - start.y;

      const length = Math.sqrt(
        dx * dx + dy * dy
      );

      if (length > 0) {
        const cutSize = 10;

        const nx =
          (-dy / length) * cutSize;

        const ny =
          (dx / length) * cutSize;

        ctx.moveTo(
          start.x + nx,
          start.y + ny
        );

        ctx.lineTo(
          end.x + nx,
          end.y + ny
        );

        ctx.lineTo(
          end.x - nx,
          end.y - ny
        );

        ctx.lineTo(
          start.x - nx,
          start.y - ny
        );

        ctx.closePath();
      }
    }

    ctx.closePath();
  }}
>
  {hatchLines}
</Group>

      {/* =========================
    HATCH GRIPS
========================= */}

{selectedIndex === index && (
  <>
    <Circle
      x={x}
      y={y}
      radius={5 / scale}
      fill="yellow"
      stroke="#000000"
      strokeWidth={1 / scale}
      draggable
      onDragEnd={(e) => {
        const newX = e.target.x();
        const newY = e.target.y();

        setObjects((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  x: newX,
                  y: newY,
                  width:
                    item.width +
                    (item.x - newX),
                  height:
                    item.height +
                    (item.y - newY),
                }
              : item
          )
        );

        e.target.position({
          x: newX,
          y: newY,
        });
      }}
    />

    <Circle
      x={x + width}
      y={y}
      radius={5 / scale}
      fill="yellow"
      stroke="#000000"
      strokeWidth={1 / scale}
      draggable
      onDragEnd={(e) => {
        const newX = e.target.x();

        setObjects((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  width:
                    newX - item.x,
                }
              : item
          )
        );
      }}
    />

    <Circle
      x={x}
      y={y + height}
      radius={5 / scale}
      fill="yellow"
      stroke="#000000"
      strokeWidth={1 / scale}
      draggable
      onDragEnd={(e) => {
        const newY = e.target.y();

        setObjects((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  height:
                    newY - item.y,
                }
              : item
          )
        );
      }}
    />

    <Circle
      x={x + width}
      y={y + height}
      radius={5 / scale}
      fill="yellow"
      stroke="#000000"
      strokeWidth={1 / scale}
      draggable
      onDragEnd={(e) => {
        const newX = e.target.x();
        const newY = e.target.y();

        setObjects((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  width:
                    newX - item.x,
                  height:
                    newY - item.y,
                }
              : item
          )
        );
      }}
    />
  </>
)}
    </React.Fragment>
  );
}

/* POLYLINE */
if (
  object.type ===
  "polyline"
) {
  return (
    <React.Fragment key={index}>

    <Line
  {...commonProps}
  points={object.points}
  rotation={
    object.rotation ||
    0
  }
  stroke={
    joinSelected
      ? "#00ff66"
      : selectedIndex === index
        ? "yellow"
        : object.color ||
          "#ffffff"
  }
  strokeWidth={
    selectedIndex === index
      ? 4 / scale
      : (object.strokeWidth || 2) / scale
  }
  hitStrokeWidth={
    tool === "join"
      ? 40
      : 20
  }
/>

      {/* POLYLINE GRIPS */}

      {selectedIndex === index &&
        object.points.map(
          (point, pointIndex) => {

            if (pointIndex % 2 !== 0) {
              return null;
            }

            return (
              <Circle
                key={pointIndex}
                x={object.points[pointIndex]}
                y={object.points[pointIndex + 1]}
                radius={6 / scale}
                fill="#00aaff"
                stroke="white"
                strokeWidth={2 / scale}
                draggable
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                }}
                onDragEnd={(e) =>
                  handlePolylineGripDragEnd(
                    index,
                    pointIndex,
                    e
                  )
                }
              />
            );
          }
        )}

    </React.Fragment>
  );
}

/* =========================
   SPLINE PREVIEW
========================= */

if (
  tool === "spline" &&
  splinePoints.length >= 2 &&
  splinePreviewPoint
) {
  const previewPoints = [
    ...splinePoints,
    splinePreviewPoint.x,
    splinePreviewPoint.y,
  ];

  return (
    <Line
      points={previewPoints}
      stroke="#00aaff"
      strokeWidth={2 / scale}
      lineCap="round"
      lineJoin="round"
      tension={0.5}
      bezier={false}
      listening={false}
      dash={[
        8 / scale,
        6 / scale,
      ]}
    />
  );
}

/* =========================
   SPLINE
========================= */

if (
  object.type ===
  "spline"
) {
  return (
    <React.Fragment key={index}>

      <Line
        {...commonProps}
        points={object.points}
        rotation={
          object.rotation ||
          0
        }
        stroke={
          selectedIndex === index
            ? "yellow"
            : object.color ||
              "#ffffff"
        }
        strokeWidth={
          selectedIndex === index
            ? 4 / scale
            : (object.strokeWidth || 2) / scale
        }
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={20}
      />

    </React.Fragment>
  );
}

/* =========================
   ARC
========================= */

if (object.type === "arc") {
  const start = object.angleStart || 0;
  const end = object.angleEnd || 0;
const radius = Math.max(
  0,
  Number(object.radius) || 0
);

  const points = [];
  const steps = 80;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    const angle =
      start + (end - start) * t;

    points.push(
      object.x +
        radius * Math.cos(angle)
    );

    points.push(
      object.y +
        radius * Math.sin(angle)
    );
  }

return (
  <Line
    key={index}
      {...commonProps}
      points={points}
      stroke={
       selectedIndex === index
          ? "yellow"
          : object.color || "#ffffff"
      }
     strokeWidth={
  selectedIndex === index
    ? 4 / scale
    : (object.strokeWidth || 2) / scale
}
      lineCap="round"
      lineJoin="round"
      hitStrokeWidth={
  tool === "join"
    ? 40
    : 15
}
    />
  );
}

/* TEXT */
if (
  object.type ===
  "text"
) {
  return (
    <Text
      {...commonProps}
      x={object.x}
      y={object.y}
      text={object.text}
      fontSize={
        object.fontSize ||
        24
      }
      fill={
  selectedIndex === index
    ? "yellow"
    : object.color ||
      "#ffffff"
}
     rotation={
  object.rotation ||
  0
}
hitStrokeWidth={
  tool === "join"
    ? 40
    : 20
}
onDblClick={() => {
  if (isObjectLocked(index)) {
    window.alert(
      "This object is locked."
    );
    return;
  }

  const newText =
    window.prompt(
      "Edit text:",
      object.text || ""
    );

  if (
    newText === null
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (item, itemIndex) => {
        if (
          itemIndex !== index
        ) {
          return item;
        }

        return {
          ...item,
          text: newText,
        };
      }
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    index
  );

  setSelectedIndexes([
    index,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );
}}

onDblTap={() => {
  if (isObjectLocked(index)) {
    window.alert(
      "This object is locked."
    );
    return;
  }

  const newText =
    window.prompt(
      "Edit text:",
      object.text || ""
    );

  if (
    newText === null
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const updatedObjects =
    objects.map(
      (item, itemIndex) => {
        if (
          itemIndex !== index
        ) {
          return item;
        }

        return {
          ...item,
          text: newText,
        };
      }
    );

  setObjects(
    updatedObjects
  );

  setSelectedIndex(
    index
  );

  setSelectedIndexes([
    index,
  ]);

  saveHistory(
    previousObjects,
    [...measurements]
  );
}}
    />
  );
}
 return null;
 }
)}
              {/* =========================
                  STRETCH HANDLES
              ========================= */}

              {(tool === "stretch" || tool === "select") &&
                selectedObject &&
                !selectedObject.locked && (
                   <>

                   {/* TEXT HANDLE */}

{selectedObject?.type === "text" && (
  <Circle
 x={
  selectedObject.x +
  Math.cos(
    ((selectedObject.rotation || 0) *
      Math.PI) /
      180
  ) *
    (
      (selectedObject.text?.length || 1) *
        (selectedObject.fontSize || 24) *
        0.55
    )
}
    radius={12 / scale}
    fill="#00aaff"
    stroke="black"
    strokeWidth={2 / scale}
    draggable={tool === "move"}
    onMouseDown={(e) => {
      e.cancelBubble = true;
    }}
   onDragMove={(e) => {
  handleTextGripDragEnd(
    selectedIndex,
    e
  );
}}
  />
)}

                    {/* LINE HANDLES */}

                    {selectedObject?.type ===
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
                          radius={12 / scale}
                          fill="#00aaff"
                          stroke="black"
                          strokeWidth={2 / scale}
                          draggable={tool === "move"}
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
{/* TEXT ROTATION GRIP */}

<Circle
 x={
  selectedObject.x +
  Math.cos(
    ((selectedObject.rotation || 0) *
      Math.PI) /
      180
  ) *
    (
      (selectedObject.text?.length || 1) *
        (selectedObject.fontSize || 24) *
        0.55
    )
}
y={
  selectedObject.y +
  Math.sin(
    ((selectedObject.rotation || 0) *
      Math.PI) /
      180
  ) *
    (
      (selectedObject.text?.length || 1) *
        (selectedObject.fontSize || 24) *
        0.55
    ) -
  (selectedObject.fontSize || 24) * 1.5
}
  radius={12 / scale}
  fill="#ff9900"
  stroke="white"
  strokeWidth={2 / scale}
  draggable={tool === "move"}
  onMouseDown={(e) => {
    e.cancelBubble = true;
  }}
  onTouchStart={(e) => {
    e.cancelBubble = true;
  }}
  onDragStart={() =>
    startStretch(
      selectedIndex,
      "text-rotate"
    )
  }
  onDragMove={(e) =>
    updateStretch(
      selectedIndex,
      "text-rotate",
      e
    )
  }
  onDragEnd={endStretch}
/>
</>
)}

{/* =========================
    SCALE GRIP
========================= */}

{selectedObject &&
  !selectedObject.locked &&
  (
    selectedObject.type === "line" ||
    selectedObject.type === "polyline" ||
    selectedObject.type === "rectangle" ||
    selectedObject.type === "circle" ||
    selectedObject.type === "arc" ||
    selectedObject.type === "text"
  ) && (
    <Circle
      x={(() => {
        const object =
          selectedObject;

        if (
          object.type === "line"
        ) {
          return Math.max(
            object.points[0],
            object.points[2]
          );
        }

        if (
          object.type === "polyline"
        ) {
          const xs = [];

          for (
            let i = 0;
            i < object.points.length;
            i += 2
          ) {
            xs.push(
              object.points[i]
            );
          }

          return Math.max(...xs);
        }

        if (
          object.type === "rectangle"
        ) {
          return (
            object.x +
            object.width
          );
        }

        if (
          object.type === "circle" ||
          object.type === "arc"
        ) {
          return (
            object.x +
            object.radius
          );
        }

        return (
          object.x +
          (object.text?.length ||
            1) *
            (object.fontSize ||
              24) *
            0.55
        );
      })()}

      y={(() => {
        const object =
          selectedObject;

        if (
          object.type === "line"
        ) {
          return Math.max(
            object.points[1],
            object.points[3]
          );
        }

        if (
          object.type === "polyline"
        ) {
          const ys = [];

          for (
            let i = 1;
            i < object.points.length;
            i += 2
          ) {
            ys.push(
              object.points[i]
            );
          }

          return Math.max(...ys);
        }

        if (
          object.type === "rectangle"
        ) {
          return (
            object.y +
            object.height
          );
        }

        if (
          object.type === "circle" ||
          object.type === "arc"
        ) {
          return (
            object.y +
            object.radius
          );
        }

        return (
          object.y +
          (object.fontSize ||
            24)
        );
      })()}

      radius={12 / scale}
      fill="#ff00ff"
      stroke="white"
      strokeWidth={2 / scale}
      draggable={tool === "move"}

      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}

      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}

      onDragStart={() =>
        startStretch(
          selectedIndex,
          "scale-grip"
        )
      }

      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "scale-grip",
          e
        )
      }

      onDragEnd={endStretch}
    />
  )}

{/* =========================
DIMENSION HANDLES
========================= */}

{selectedMeasurementIndex !== null &&
  measurements[selectedMeasurementIndex] &&
  (
    measurements[selectedMeasurementIndex].type ===
      "dimension" ||
    measurements[selectedMeasurementIndex].type ===
      "measure"
  ) && (
    <>
      <Circle
  x={
    measurements[selectedMeasurementIndex].x1
  }
  y={
    measurements[selectedMeasurementIndex].y1
  }
  radius={12 / scale}
  fill="#00aaff"
  stroke="black"
  strokeWidth={2 / scale}
  draggable={tool === "move"}

  onMouseDown={(e) => {
    e.cancelBubble = true;
  }}

  onTouchStart={(e) => {
    e.cancelBubble = true;
  }}

  onDragMove={(e) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;
const rawX =
  (pointer.x - position.x) / scale;

const rawY =
  (pointer.y - position.y) / scale;

const snappedPoint = objectSnapEnabled
  ? snapToObject(rawX, rawY)
  : {
      x: snapToGrid(rawX),
      y: snapToGrid(rawY),
    };

const x = snappedPoint.x;
const y = snappedPoint.y;

    setMeasurements((prev) =>
      prev.map((m, i) => {
        if (i !== selectedMeasurementIndex) {
          return m;
        }

        return {
          ...m,
          x1: x,
          y1: y,
          distance: Math.round(
            Math.hypot(
              m.x2 - x,
              m.y2 - y
            )
          ),
        };
         })
        );

  }}

  onDragEnd={() => {
    saveHistory(objects, measurements);
  }}

/>
<Circle
  x={
    measurements[selectedMeasurementIndex].x2
  }
  y={
    measurements[selectedMeasurementIndex].y2
  }
  radius={12 / scale}
  fill="#00aaff"
  stroke="black"
  strokeWidth={2 / scale}
  draggable={tool === "move"}

  onMouseDown={(e) => {
    e.cancelBubble = true;
  }}

  onTouchStart={(e) => {
    e.cancelBubble = true;
  }}

  onDragMove={(e) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

   const rawX =
  (pointer.x - position.x) / scale;

const rawY =
  (pointer.y - position.y) / scale;

const snappedPoint = objectSnapEnabled
  ? snapToObject(rawX, rawY)
  : {
      x: snapToGrid(rawX),
      y: snapToGrid(rawY),
    };

const x = snappedPoint.x;
const y = snappedPoint.y;
    setMeasurements((prev) =>
      prev.map((m, i) => {
        if (i !== selectedMeasurementIndex) {
          return m;
        }

        return {
          ...m,
          x2: x,
          y2: y,
          distance: Math.round(
            Math.hypot(
              x - m.x1,
              y - m.y1
            )
          ),
        };
        })
      );

  }}

  onDragEnd={() => {
    saveHistory(objects, measurements);
  }}

/>
    </>
  )}

  
{/* =========================
    ANGULAR DIMENSION HANDLES
========================= */}

{selectedMeasurementIndex !== null &&
  measurements[selectedMeasurementIndex] &&
  measurements[selectedMeasurementIndex].type ===
    "angularDimension" && (
    <>
      {/* VERTEX GRIP */}
      <Circle
        x={
          measurements[selectedMeasurementIndex].x1
        }
        y={
          measurements[selectedMeasurementIndex].y1
        }
        radius={12 / scale}
        fill="#00aaff"
        stroke="black"
        strokeWidth={2 / scale}
        draggable={tool === "move"}

        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}

        onTouchStart={(e) => {
          e.cancelBubble = true;
        }}

        onDragMove={(e) => {
          const stage =
            e.target.getStage();

          if (!stage) return;

          const pointer =
            stage.getPointerPosition();

          if (!pointer) return;

          const rawX =
            (pointer.x - position.x) / scale;

          const rawY =
            (pointer.y - position.y) / scale;

          const point =
            objectSnapEnabled
              ? snapToObject(rawX, rawY)
              : {
                  x: snapToGrid(rawX),
                  y: snapToGrid(rawY),
                };

          setMeasurements((prev) =>
            prev.map((m, i) => {
              if (
                i !== selectedMeasurementIndex
              ) {
                return m;
              }

              const dx1 = m.x2 - m.x1;
              const dy1 = m.y2 - m.y1;

              const dx2 = m.x3 - m.x1;
              const dy2 = m.y3 - m.y1;

              return {
                ...m,

                x1: point.x,
                y1: point.y,

                x2: point.x + dx1,
                y2: point.y + dy1,

                x3: point.x + dx2,
                y3: point.y + dy2,
              };
            })
          );
        }}

        onDragEnd={() => {
          saveHistory(
            objects,
            measurements
          );
        }}
      />

      {/* FIRST ANGLE ARM GRIP */}
      <Circle
        x={
          measurements[selectedMeasurementIndex].x2
        }
        y={
          measurements[selectedMeasurementIndex].y2
        }
        radius={12 / scale}
        fill="#00aaff"
        stroke="black"
        strokeWidth={2 / scale}
        draggable={tool === "move"}

        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}

        onTouchStart={(e) => {
          e.cancelBubble = true;
        }}

        onDragMove={(e) => {
          const stage =
            e.target.getStage();

          if (!stage) return;

          const pointer =
            stage.getPointerPosition();

          if (!pointer) return;

          const rawX =
            (pointer.x - position.x) / scale;

          const rawY =
            (pointer.y - position.y) / scale;

          const point =
            objectSnapEnabled
              ? snapToObject(rawX, rawY)
              : {
                  x: snapToGrid(rawX),
                  y: snapToGrid(rawY),
                };

          setMeasurements((prev) =>
            prev.map((m, i) => {
              if (
                i !== selectedMeasurementIndex
              ) {
                return m;
              }

              return {
                ...m,
                x2: point.x,
                y2: point.y,
              };
            })
          );
        }}

        onDragEnd={() => {
          saveHistory(
            objects,
            measurements
          );
        }}
      />

      {/* SECOND ANGLE ARM GRIP */}
      <Circle
        x={
          measurements[selectedMeasurementIndex].x3
        }
        y={
          measurements[selectedMeasurementIndex].y3
        }
        radius={12 / scale}
        fill="#00aaff"
        stroke="black"
        strokeWidth={2 / scale}
        draggable={tool === "move"}

        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}

        onTouchStart={(e) => {
          e.cancelBubble = true;
        }}

        onDragMove={(e) => {
          const stage =
            e.target.getStage();

          if (!stage) return;

          const pointer =
            stage.getPointerPosition();

          if (!pointer) return;

          const rawX =
            (pointer.x - position.x) / scale;

          const rawY =
            (pointer.y - position.y) / scale;

          const point =
            objectSnapEnabled
              ? snapToObject(rawX, rawY)
              : {
                  x: snapToGrid(rawX),
                  y: snapToGrid(rawY),
                };

          setMeasurements((prev) =>
            prev.map((m, i) => {
              if (
                i !== selectedMeasurementIndex
              ) {
                return m;
              }

              return {
                ...m,
                x3: point.x,
                y3: point.y,
              };
            })
          );
        }}

        onDragEnd={() => {
          saveHistory(
            objects,
            measurements
          );
        }}
      />
    </>
  )}

  {/* =========================
    RADIUS / DIAMETER HANDLES
========================= */}

{selectedMeasurementIndex !== null &&
  measurements[selectedMeasurementIndex] &&
  (
    measurements[selectedMeasurementIndex].type ===
      "radiusDimension" ||
    measurements[selectedMeasurementIndex].type ===
      "diameterDimension"
  ) && (
    <>
      {/* CENTER GRIP */}

      <Circle
        x={
          measurements[selectedMeasurementIndex].x1
        }
        y={
          measurements[selectedMeasurementIndex].y1
        }
        radius={12 / scale}
        fill="#00aaff"
        stroke="black"
        strokeWidth={2 / scale}
        draggable={tool === "move"}

        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}

        onTouchStart={(e) => {
          e.cancelBubble = true;
        }}

        onDragMove={(e) => {
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

          const point =
            objectSnapEnabled
              ? snapToObject(
                  rawX,
                  rawY
                )
              : {
                  x: snapToGrid(rawX),
                  y: snapToGrid(rawY),
                };

          setMeasurements((prev) =>
            prev.map((m, i) => {
              if (
                i !==
                selectedMeasurementIndex
              ) {
                return m;
              }

              const dx =
                m.x2 - m.x1;

              const dy =
                m.y2 - m.y1;

              return {
                ...m,

                x1: point.x,
                y1: point.y,

                x2:
                  point.x + dx,

                y2:
                  point.y + dy,
              };
            })
          );
        }}

        onDragEnd={() => {
          saveHistory(
            objects,
            measurements
          );
        }}
      />

      {/* RADIUS / DIAMETER END GRIP */}

      <Circle
        x={
          measurements[selectedMeasurementIndex].x2
        }
        y={
          measurements[selectedMeasurementIndex].y2
        }
        radius={12 / scale}
        fill="#00aaff"
        stroke="black"
        strokeWidth={2 / scale}
        draggable={tool === "move"}

        onMouseDown={(e) => {
          e.cancelBubble = true;
        }}

        onTouchStart={(e) => {
          e.cancelBubble = true;
        }}

        onDragMove={(e) => {
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

          const point =
            objectSnapEnabled
              ? snapToObject(
                  rawX,
                  rawY
                )
              : {
                  x: snapToGrid(rawX),
                  y: snapToGrid(rawY),
                };

          setMeasurements((prev) =>
            prev.map((m, i) => {
              if (
                i !==
                selectedMeasurementIndex
              ) {
                return m;
              }

              const dx =
                point.x - m.x1;

              const dy =
                point.y - m.y1;

              const distance =
                Math.max(
                  1,
                  Math.hypot(
                    dx,
                    dy
                  )
                );

              const ux =
                dx / distance;

              const uy =
                dy / distance;

              const circle =
                objects[
                  m.objectIndex
                ];

              if (!circle) {
                return m;
              }

              const radius =
                circle.radius;

              const newX2 =
                m.x1 +
                ux * radius;

              const newY2 =
                m.y1 +
                uy * radius;

              return {
                ...m,

                x2: newX2,
                y2: newY2,

                radius:
                  Math.round(
                    radius * 100
                  ) / 100,

                diameter:
                  Math.round(
                    radius *
                      2 *
                      100
                  ) / 100,
              };
            })
          );
        }}

        onDragEnd={() => {
          saveHistory(
            objects,
            measurements
          );
        }}
      />
    </>
  )}

 {/* =========================
    RECTANGLE HANDLES
========================= */}

{selectedObject?.type === "rectangle" && (
  <>
    {/* TOP LEFT */}
    <Circle
      x={selectedObject.x}
      y={selectedObject.y}
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleRectangleGripDragEnd(
          selectedIndex,
          "top-left",
          e
        )
      }
    />

    {/* TOP */}
    <Circle
      x={
        selectedObject.x +
        selectedObject.width / 2
      }
      y={selectedObject.y}
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleRectangleGripDragEnd(
          selectedIndex,
          "top",
          e
        )
      }
    />

    {/* TOP RIGHT */}
    <Circle
      x={
        selectedObject.x +
        selectedObject.width
      }
      y={selectedObject.y}
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleRectangleGripDragEnd(
          selectedIndex,
          "top-right",
          e
        )
      }
    />

    {/* RIGHT */}
    <Circle
      x={
        selectedObject.x +
        selectedObject.width
      }
      y={
        selectedObject.y +
        selectedObject.height / 2
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleRectangleGripDragEnd(
          selectedIndex,
          "right",
          e
        )
      }
    />

    {/* BOTTOM RIGHT */}
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
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleRectangleGripDragEnd(
          selectedIndex,
          "bottom-right",
          e
        )
      }
    />

    {/* BOTTOM */}
    <Circle
      x={
        selectedObject.x +
        selectedObject.width / 2
      }
      y={
        selectedObject.y +
        selectedObject.height
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleRectangleGripDragEnd(
          selectedIndex,
          "bottom",
          e
        )
      }
    />

    {/* BOTTOM LEFT */}
    <Circle
      x={selectedObject.x}
      y={
        selectedObject.y +
        selectedObject.height
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleRectangleGripDragEnd(
          selectedIndex,
          "bottom-left",
          e
        )
      }
    />

    {/* LEFT */}
    <Circle
      x={selectedObject.x}
      y={
        selectedObject.y +
        selectedObject.height / 2
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) =>
        handleRectangleGripDragEnd(
          selectedIndex,
          "left",
          e
        )
      }
    />
  </>
)}

 {/* =========================
    CIRCLE HANDLES
========================= */}

{selectedObject?.type === "circle" && (
  <>
    {/* RIGHT GRIP */}
    <Circle
      x={
        selectedObject.x +
        selectedObject.radius
      }
      y={selectedObject.y}
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={() =>
        startStretch(
          selectedIndex,
          "radius"
        )
      }
      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "radius",
          e
        )
      }
      onDragEnd={endStretch}
    />

    {/* LEFT GRIP */}
    <Circle
      x={
        selectedObject.x -
        selectedObject.radius
      }
      y={selectedObject.y}
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={() =>
        startStretch(
          selectedIndex,
          "radius"
        )
      }
      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "radius",
          e
        )
      }
      onDragEnd={endStretch}
    />

    {/* TOP GRIP */}
    <Circle
      x={selectedObject.x}
      y={
        selectedObject.y -
        selectedObject.radius
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={() =>
        startStretch(
          selectedIndex,
          "radius"
        )
      }
      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "radius",
          e
        )
      }
      onDragEnd={endStretch}
    />

    {/* BOTTOM GRIP */}
    <Circle
      x={selectedObject.x}
      y={
        selectedObject.y +
        selectedObject.radius
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={() =>
        startStretch(
          selectedIndex,
          "radius"
        )
      }
      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "radius",
          e
        )
      }
      onDragEnd={endStretch}
    />
  </>
)}
{/* =========================
    POLYLINE HANDLES
========================= */}

{selectedObject?.type === "polyline" && (
  <>
    {Array.from({
      length:
        selectedObject.points.length / 2,
    }).map((_, pointIndex) => {
      const x =
        selectedObject.points[
          pointIndex * 2
        ];

      const y =
        selectedObject.points[
          pointIndex * 2 + 1
        ];

      return (
        <Circle
          key={pointIndex}
          x={x}
          y={y}
          radius={8}
          fill="yellow"
          stroke="black"
          strokeWidth={2 / scale}
          draggable
          onMouseDown={(e) => {
            e.cancelBubble = true;
          }}
          onTouchStart={(e) => {
            e.cancelBubble = true;
          }}
          onDragEnd={(e) =>
            handlePolylineGripDragEnd(
              selectedIndex,
              pointIndex * 2,
              e
            )
          }
        />
      );
    })}
  </>
)}
 </>
)}
</Group>

</Layer>

{/* =========================
    MOBILE TRACE OVERLAY
========================= */}

<Layer listening={traceEditMode}>
  <Group
    x={position.x}
    y={position.y}
    scaleX={scale}
    scaleY={scale}
  >
    {(
      mobileTraceList.find(
        (trace) => trace.id === activeTraceId
      )?.strokes || []
    ).map((stroke) => (
      <Line
        key={stroke.id}
        points={stroke.points}
        stroke={stroke.color || "#39c5ff"}
        strokeWidth={3 / (scale || 1)}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    ))}

    {traceEditMode &&
      currentTracePoints.length >= 4 && (
        <Line
          points={currentTracePoints}
          stroke="#39c5ff"
          strokeWidth={3 / (scale || 1)}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}

    {traceEditMode && (
      <Rect
        x={
          -position.x / (scale || 1)
        }
        y={
          -position.y / (scale || 1)
        }
        width={
          (
            viewportSize.width <= 768
              ? viewportSize.width
              : viewportSize.width - 298
          ) / (scale || 1)
        }
        height={
          (
            viewportSize.width <= 768
              ? viewportSize.height - 87 - 64
              : viewportSize.height - 87
          ) / (scale || 1)
        }
        fill="rgba(0,0,0,0.001)"
        strokeEnabled={false}
        listening={true}

        onMouseDown={startMobileTraceStroke}
        onMouseMove={moveMobileTraceStroke}
        onMouseUp={finishMobileTraceStroke}
        onMouseLeave={finishMobileTraceStroke}

        onTouchStart={startMobileTraceStroke}
        onTouchMove={moveMobileTraceStroke}
        onTouchEnd={finishMobileTraceStroke}
      />
    )}
  </Group>
</Layer>


</Stage>
{/* =========================
    CURSOR COORDINATES
========================= */}

<div
  style={{
    position: "absolute",
    left:
      (mousePosition.x * scale) +
      position.x +
      14,
    top:
      (mousePosition.y * scale) +
      position.y +
      14,
    zIndex: 4500,
    pointerEvents: "none",
    background: "rgba(20, 20, 20, 0.92)",
    border: "1px solid #444",
    borderRadius: "4px",
    padding: "4px 8px",
    color: "#ffffff",
    fontSize: "12px",
    fontFamily:
      "monospace",
    whiteSpace: "nowrap",
  }}
>
  X: {mousePosition.x}
  {"  "}
  Y: {mousePosition.y}
</div>

{/* =========================
    CAD CROSSHAIR
========================= */}

<div
  style={{
    position: "absolute",
    left: 0,
    right: 0,
    top:
      (mousePosition.y * scale) +
      position.y,
    height: "1px",
    background:
      "rgba(255,255,255,0.22)",
    pointerEvents: "none",
    zIndex: 4400,
  }}
/>

<div
  style={{
    position: "absolute",
    top: 0,
    bottom: 0,
    left:
      (mousePosition.x * scale) +
      position.x,
    width: "1px",
    background:
      "rgba(255,255,255,0.22)",
    pointerEvents: "none",
    zIndex: 4400,
  }}
/>

{/* =========================
    OSNAP MARKER
========================= */}

{snapPoint && (
  <>
    {/* SNAP TYPE MARKER */}

{snapType === "END" ||
 snapType === "CORNER" ||
 snapType === "START" ? (
  <div
    style={{
      position: "absolute",
      left:
        snapPoint.x * scale +
        position.x,
      top:
        snapPoint.y * scale +
        position.y,
      width: "12px",
      height: "12px",
      border: "2px solid #ffd400",
      transform:
        "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 4450,
      boxSizing: "border-box",
    }}
  />
) : snapType === "MID" ? (
  <div
    style={{
      position: "absolute",
      left:
        snapPoint.x * scale +
        position.x,
      top:
        snapPoint.y * scale +
        position.y,
      width: 0,
      height: 0,
      borderLeft:
        "7px solid transparent",
      borderRight:
        "7px solid transparent",
      borderBottom:
        "12px solid #ffd400",
      transform:
        "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 4450,
    }}
  />
) : snapType === "CENTER" ? (
  <div
    style={{
      position: "absolute",
      left:
        snapPoint.x * scale +
        position.x,
      top:
        snapPoint.y * scale +
        position.y,
      width: "12px",
      height: "12px",
      border:
        "2px solid #ffd400",
      borderRadius: "50%",
      transform:
        "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 4450,
      boxSizing: "border-box",
    }}
  />
) : snapType === "INTERSECTION" ? (
  <div
    style={{
      position: "absolute",
      left:
        snapPoint.x * scale +
        position.x,
      top:
        snapPoint.y * scale +
        position.y,
      width: "14px",
      height: "14px",
      transform:
        "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 4450,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: "6px",
        top: "0px",
        width: "2px",
        height: "14px",
        background: "#ffd400",
        transform: "rotate(45deg)",
      }}
    />

    <div
      style={{
        position: "absolute",
        left: "6px",
        top: "0px",
        width: "2px",
        height: "14px",
        background: "#ffd400",
        transform: "rotate(-45deg)",
      }}
    />
  </div>
) : (
  <div
    style={{
      position: "absolute",
      left:
        snapPoint.x * scale +
        position.x,
      top:
        snapPoint.y * scale +
        position.y,
      width: "12px",
      height: "12px",
      border: "2px solid #ffd400",
      transform:
        "translate(-50%, -50%) rotate(45deg)",
      pointerEvents: "none",
      zIndex: 4450,
      boxSizing: "border-box",
    }}
  />
)}

    {/* SNAP LABEL */}
    <div
      style={{
        position: "absolute",
        left:
          snapPoint.x * scale +
          position.x +
          12,
        top:
          snapPoint.y * scale +
          position.y -
          28,
        padding: "3px 6px",
        background:
          "rgba(20,20,20,0.9)",
        border:
          "1px solid #ffd400",
        borderRadius: "3px",
        color: "#ffd400",
        fontSize: "10px",
        fontFamily: "monospace",
        fontWeight: "bold",
        pointerEvents: "none",
        zIndex: 4450,
      }}
    >
    {snapType || "OSNAP"}
    </div>
  </>
)}

{snapPoint && (
  <div
    style={{
      position: "absolute",
      left:
        snapPoint.x * scale +
        position.x +
        12,
      top:
        snapPoint.y * scale +
        position.y +
        8,
      zIndex: 4450,
      pointerEvents: "none",
      background: "rgba(20,20,20,0.92)",
      border: "1px solid #ffd400",
      borderRadius: "3px",
      padding: "3px 6px",
      color: "#ffd400",
      fontSize: "10px",
      fontFamily: "monospace",
      whiteSpace: "nowrap",
    }}
  >
    X:{Math.round(snapPoint.x)}
    {"  "}
    Y:{Math.round(snapPoint.y)}
  </div>
)}

{/* =========================
    UCS / AXIS INDICATOR
========================= */}

<div
  style={{
    position: "absolute",
    left: "14px",
    bottom: "14px",
    width: "64px",
    height: "64px",
    zIndex: 4300,
    pointerEvents: "none",
    background: "rgba(15, 15, 15, 0.72)",
    border: "1px solid #444",
    borderRadius: "8px",
  }}
>
  {/* X AXIS */}
  <div
    style={{
      position: "absolute",
      left: "29px",
      top: "31px",
      width: "25px",
      height: "2px",
      background: "#d07070",
    }}
  />

  <div
    style={{
      position: "absolute",
      left: "50px",
      top: "27px",
      width: "0",
      height: "0",
      borderTop: "5px solid transparent",
      borderBottom: "5px solid transparent",
      borderLeft: "8px solid #d07070",
    }}
  />

  {/* Y AXIS */}
  <div
    style={{
      position: "absolute",
      left: "30px",
      top: "11px",
      width: "2px",
      height: "25px",
      background: "#70b878",
    }}
  />

  <div
    style={{
      position: "absolute",
      left: "26px",
      top: "7px",
      width: "0",
      height: "0",
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderBottom: "8px solid #70b878",
    }}
  />

  {/* CENTER */}
  <div
    style={{
      position: "absolute",
      left: "27px",
      top: "28px",
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: "#ffffff",
    }}
  />

  <span
    style={{
      position: "absolute",
      right: "6px",
      bottom: "4px",
      color: "#d07070",
      fontSize: "10px",
      fontWeight: "bold",
    }}
  >
    X
  </span>

  <span
    style={{
      position: "absolute",
      left: "6px",
      top: "4px",
      color: "#70b878",
      fontSize: "10px",
      fontWeight: "bold",
    }}
  >
    Y
  </span>
</div>

{/* =========================
    SCALE INDICATOR
========================= */}

{(() => {
  const displayGridStep =
    scale < 0.35
      ? 100
      : scale < 0.6
        ? 50
        : 25;

  const barWidth = Math.max(
    50,
    Math.min(
      150,
      displayGridStep * scale
    )
  );

  return (
    <div
      style={{
        position: "absolute",
        right: "16px",
        bottom: "16px",
        zIndex: 4300,
        pointerEvents: "none",
        color: "#cccccc",
        fontSize: "11px",
        fontFamily: "monospace",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: `${barWidth}px`,
          height: "2px",
          background: "#cccccc",
          marginBottom: "4px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "-4px",
            width: "2px",
            height: "10px",
            background: "#cccccc",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: 0,
            top: "-4px",
            width: "2px",
            height: "10px",
            background: "#cccccc",
          }}
        />
      </div>

      <div>
        {displayGridStep} units
      </div>
    </div>
  );
})()}

{showLineInput && (
  <div
    style={{
      position: "absolute",
      left: "50%",
      bottom: "20px",
      transform: "translateX(-50%)",
      zIndex: 5000,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px",
      background: "#1f1f1f",
      border: "1px solid #555",
      borderRadius: "10px",
      boxShadow:
        "0 4px 20px rgba(0,0,0,0.4)",
    }}
  >
    {/* DISTANCE */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span
        style={{
          color: "#aaa",
          fontSize: "11px",
        }}
      >
        Distance
      </span>

      <input
        type="text"
        inputMode="decimal"
        value={
          lineLengthInput.includes("<")
            ? lineLengthInput.split("<")[0]
            : lineLengthInput
        }
        autoFocus
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const angle =
            lineLengthInput.includes("<")
              ? lineLengthInput.split("<")[1]
              : "0";

          setLineLengthInput(
            `${e.target.value}<${angle}`
          );
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
  e.preventDefault();

  setMobileCommandHistory((history) => {
    if (history.length === 0) {
      return history;
    }

    setMobileCommandHistoryIndex((current) => {
      const nextIndex =
        current <= 0
          ? history.length - 1
          : current - 1;

      setCommandText(
        history[nextIndex] || ""
      );

      return nextIndex;
    });

    return history;
  });

  return;
}

if (e.key === "ArrowDown") {
  e.preventDefault();

  setMobileCommandHistory((history) => {
    if (history.length === 0) {
      return history;
    }

    setMobileCommandHistoryIndex((current) => {
      const nextIndex =
        current >= history.length - 1
          ? 0
          : current + 1;

      setCommandText(
        history[nextIndex] || ""
      );

      return nextIndex;
    });

    return history;
  });

  return;
}
          if (e.key === "Enter") {
            e.preventDefault();
            confirmLineInput();
          }
        }}
        style={{
          width: "110px",
          padding: "10px",
          background: "#111",
          color: "#fff",
          border: "1px solid #666",
          borderRadius: "6px",
          outline: "none",
          fontSize: "16px",
        }}
      />
    </div>

    {/* ANGLE */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span
        style={{
          color: "#aaa",
          fontSize: "11px",
        }}
      >
        Angle
      </span>

      <input
        type="text"
        inputMode="decimal"
        onFocus={(e) => e.target.select()}
        value={
          lineLengthInput.includes("<")
            ? lineLengthInput.split("<")[1]
            : "0"
        }
        onChange={(e) => {
          const distance =
            lineLengthInput.includes("<")
              ? lineLengthInput.split("<")[0]
              : lineLengthInput;

          setLineLengthInput(
            `${distance}<${e.target.value}`
          );
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmLineInput();
          }
        }}
        style={{
          width: "80px",
          padding: "10px",
          background: "#111",
          color: "#fff",
          border: "1px solid #666",
          borderRadius: "6px",
          outline: "none",
          fontSize: "16px",
        }}
      />
    </div>

    {/* CANCEL */}
    <button
      type="button"
      onClick={() => {
        setLineStart(null);
        setLinePreview(null);
        setPendingLinePoint(null);
        setLineLengthInput("");
        setShowLineInput(false);
        setIsDrawing(false);
        actionStartRef.current = null;
      }}
      style={{
        marginTop: "16px",
        padding: "10px 14px",
        background: "#333",
        color: "#fff",
        border: "1px solid #555",
        borderRadius: "6px",
        cursor: "pointer",
      }}
    >
      ✕
    </button>

    {/* CONFIRM */}
    <button
      type="button"
      onClick={confirmLineInput}
      style={{
        marginTop: "16px",
        padding: "10px 16px",
        background: "#1687ff",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "18px",
        fontWeight: "bold",
      }}
    >
      ✓
    </button>
  </div>
)}
         

        </main>

<div
  className="mobile-command-bar"
  onTouchStart={(e) => e.stopPropagation()}
  onTouchMove={(e) => e.stopPropagation()}
  onTouchEnd={(e) => e.stopPropagation()}
>

 <button
  type="button"
  onPointerDown={(e) => {
    e.stopPropagation();
  }}
  onPointerUp={(e) => {
    e.stopPropagation();
  }}
  onTouchStart={(e) => {
    e.stopPropagation();
  }}
  onTouchEnd={(e) => {
    e.stopPropagation();
  }}
  onClick={(e) => {
    e.stopPropagation();

    const bar = e.currentTarget.parentElement;

    if (!bar) return;

    const collapsed =
      bar.dataset.collapsed === "true";

    if (collapsed) {
      bar.style.setProperty(
        "height",
        "170px",
        "important"
      );

      bar.style.setProperty(
        "min-height",
        "170px",
        "important"
      );

      bar.style.setProperty(
        "max-height",
        "170px",
        "important"
      );

      bar.dataset.collapsed = "false";

      e.currentTarget.textContent = "⌃";
    } else {
      bar.style.setProperty(
        "height",
        "46px",
        "important"
      );

      bar.style.setProperty(
        "min-height",
        "46px",
        "important"
      );

      bar.style.setProperty(
        "max-height",
        "46px",
        "important"
      );

      bar.dataset.collapsed = "true";

      e.currentTarget.textContent = "⌄";
    }
  }}
  style={{
    position: "fixed",
    right: "10px",
    bottom: "180px",
    zIndex: 1200001,
    width: "42px",
    height: "42px",
    minWidth: "42px",
    minHeight: "42px",
    background: "#ffffff",
    color: "#333333",
    border: "1px solid #cccccc",
    borderRadius: "6px",
    fontSize: "22px",
    lineHeight: "42px",
    padding: 0,
    margin: 0,
    textAlign: "center",
    pointerEvents: "auto",
    touchAction: "manipulation",
  }}
>

  ⌃
</button>

{showMobileLayers && (
  <div
    onPointerDown={(e) => {
      e.stopPropagation();
    }}
    onPointerUp={(e) => {
      e.stopPropagation();
    }}
    onTouchStart={(e) => {
      e.stopPropagation();
    }}
    onTouchMove={(e) => {
      e.stopPropagation();
    }}
    onTouchEnd={(e) => {
      e.stopPropagation();
    }}
    onClick={(e) => {
      e.stopPropagation();
    }}
    style={{
      position: "fixed",
      left: "10px",
      right: "10px",
      bottom: "180px",
      zIndex: 1200000,
      background: "#171717",
      color: "#fff",
      border: "1px solid #444",
      borderRadius: "10px",
      padding: "12px",
      boxSizing: "border-box",
      maxHeight: "55vh",
      overflowY: "auto",
      pointerEvents: "auto",
      touchAction: "pan-y",
      boxShadow:
        "0 10px 30px rgba(0,0,0,0.5)",
    }}
  >
    {/* HEADER */}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
      }}
    >
      <strong>
        Layers
      </strong>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowMobileLayers(false);
        }}
        style={{
          minWidth: "44px",
          minHeight: "40px",
        }}
      >
        ✕
      </button>
    </div>

    {/* ACTIVE LAYER */}

    <div
      style={{
        fontSize: "12px",
        color: "#aaa",
        marginBottom: "8px",
      }}
    >
      Active Layer:{" "}
      <strong
        style={{
          color: "#fff",
        }}
      >
        {layers.find(
          (layer) =>
            layer.id === activeLayerId
        )?.name ||
          "Layer 0"}
      </strong>
    </div>

    {/* ADD LAYER */}

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        addLayer();
      }}
      style={{
        width: "100%",
        minHeight: "42px",
        marginBottom: "10px",
      }}
    >
      ➕ Add Layer
    </button>

    {/* LAYERS */}

    {layers.map((layer) => (
      <div
        key={layer.id}
        onClick={() => {
          setActiveLayerId(
            layer.id
          );
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px",
          marginBottom: "6px",
          borderRadius: "6px",

          background:
            activeLayerId ===
            layer.id
              ? "#2d4058"
              : "#222",

          border:
            activeLayerId ===
            layer.id
              ? "1px solid #4b6b91"
              : "1px solid #333",

          cursor: "pointer",
        }}
      >
        {/* VISIBILITY */}

        <button
          type="button"
          onClick={(event) => {
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
        >
          {layer.visible
            ? "👁"
            : "○"}
        </button>

        {/* LOCK */}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            toggleLayerLock(
              layer.id
            );
          }}
          title={
            layer.locked
              ? "Unlock Layer"
              : "Lock Layer"
          }
        >
          {layer.locked
            ? "🔒"
            : "🔓"}
        </button>

        {/* NAME */}

        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace:
              "nowrap",
            fontSize: "13px",
          }}
        >
          {layer.name}
        </span>

        {/* RENAME */}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            renameLayer(
              layer.id
            );
          }}
          title="Rename Layer"
        >
          ✎
        </button>

        {/* DELETE */}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            deleteLayer(
              layer.id
            );
          }}
          title="Delete Layer"
        >
          ×
        </button>
      </div>
    ))}

    {/* DONE */}

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setShowMobileLayers(false);
      }}
      style={{
        width: "100%",
        minHeight: "42px",
        marginTop: "4px",
      }}
    >
      Done
    </button>
  </div>
)}

<div
  className={`mobile-command-status ${
    mobileCommandPanel === "select"
      ? "mobile-select-status"
      : ""
  }`}
>

 {mobileCommandPanel === "select" ? (
  <>
    <div>Command:</div>
    <strong>
      Select and modify: Tap or drag on the canvas to select
    </strong>
  </>
) : tool === "line" ? (
    <>
      <div>
        Command: _LINE
      </div>

      <strong>
        {showLineInput
          ? "LINE Specify distance / angle"
          : linePreview && lineStart
            ? (() => {
                const dx =
                  linePreview.x2 -
                  linePreview.x1;

                const dy =
                  linePreview.y2 -
                  linePreview.y1;

                const distance =
                  Math.hypot(dx, dy);

                let angle =
                  Math.atan2(dy, dx) *
                  (180 / Math.PI);

                if (angle < 0) {
                  angle += 360;
                }

                return `LINE  Length: ${Math.round(
                  distance
                )}    Angle: ${angle.toFixed(
                  1
                )}°`;
              })()
            : lineStart
              ? "LINE Specify next point"
              : "LINE Specify first point"}
      </strong>
    </>
  ) : tool === "polyline" ? (
    <>
      <div>
        Command: _PLINE
      </div>

      <strong>
        {lineStart
          ? "POLYLINE Specify next point"
          : "POLYLINE Specify first point"}
      </strong>
    </>
  ) : tool === "measure" ? (
    <>
      <div>
        Command: _MEASUREGEOM
      </div>

      <strong>
        MEASURE Move cursor or select object
      </strong>
    </>
    ) : tool === "dimension" ? (
  <>
    <div>
      Command: _DIMENSION
    </div>

    <strong>
      DIMENSION Select first point
    </strong>
  </>
  ) : tool === "radiusDimension" ? (
    <>
      <div>
        Command: _RADIUS
      </div>

      <strong>
        RADIUS Select circle or arc
      </strong>
    </>
  ) : tool === "diameterDimension" ? (
    <>
      <div>
        Command: _DIAMETER
      </div>

      <strong>
        DIAMETER Select circle or arc
      </strong>
    </>
  ) : tool === "angularDimension" ? (
    <>
      <div>
        Command: _ANGULAR
      </div>

      <strong>
        ANGLE Select two lines
      </strong>
    </>
    ) : tool === "quickMeasure" ? (
    <>
      <div>Command: _QUICKMEASURE</div>

      <strong>
        QUICK MEASURE · Touch near an edge or inside a shape · Unit: {unit}
      </strong>
    </>
  ) : tool === "volume" ? (
    <>
      <div>Command: _VOLUME</div>

      <strong>
        {commandText.trim()
          ? commandText
          : "VOLUME Select a closed shape"}
      </strong>
    </>
  ) : tool === "area" ? (
    <>
      <div>
        Command: _AREA
      </div>

      <strong>
        {commandText.trim()
          ? commandText
          : "AREA Select closed object"}
      </strong>
    </>
  ) : tool === "rectangle" ? (
    <>
      <div>
        Command: _RECTANGLE
      </div>

      <strong>
        RECTANGLE Specify first corner
      </strong>
    </>
  ) : tool === "circle" ? (
    <>
      <div>
        Command: _CIRCLE
      </div>

      <strong>
        CIRCLE Specify center point
      </strong>
    </>
  ) : tool === "arc" ? (
    <>
      <div>
        Command: _ARC
      </div>

      <strong>
        ARC Specify center point
      </strong>
    </>
  ) : tool === "text" ? (
    <>
      <div>
        Command: _TEXT
      </div>

      <strong>
        TEXT Specify insertion point
      </strong>
    </>
  ) : tool === "hatch" ? (
    <>
      <div>
        Command: _HATCH
      </div>

      <strong>
        HATCH Select boundary
      </strong>
    </>
  ) : tool === "move" ? (
    <>
      <div>
        Command: _MOVE
      </div>

      <strong>
        MOVE Select object
      </strong>
    </>
  ) : tool === "copy" ? (
    <>
      <div>
        Command: _COPY
      </div>

      <strong>
        COPY Select object
      </strong>
    </>
  ) : tool === "rotate" ? (
    <>
      <div>
        Command: _ROTATE
      </div>

      <strong>
        ROTATE Select object
      </strong>
    </>
  ) : tool === "trim" ? (
    <>
      <div>
        Command: _TRIM
      </div>

      <strong>
        {trimFirstIndex === null
          ? "TRIM Select cutting edge"
          : "TRIM Select object to trim"}
      </strong>
    </>
  ) : tool === "extend" ? (
    <>
      <div>
        Command: _EXTEND
      </div>

      <strong>
        {extendFirstIndex === null
          ? "EXTEND Select boundary edge"
          : "EXTEND Select object to extend"}
      </strong>
    </>
  ) : tool === "stretch" ? (
    <>
      <div>
        Command: _STRETCH
      </div>

      <strong>
        STRETCH Select object or grip
      </strong>
    </>
  ) : tool === "offset" ? (
    <>
      <div>
        Command: _OFFSET
      </div>

      <strong>
        OFFSET Select object
      </strong>
    </>
  ) : tool === "mirror" ? (
    <>
      <div>
        Command: _MIRROR
      </div>

      <strong>
        MIRROR Select object
      </strong>
    </>
  ) : tool === "scale" ? (
    <>
      <div>
        Command: _SCALE
      </div>

      <strong>
        SCALE Select object
      </strong>
    </>
  ) : tool === "fillet" ? (
    <>
      <div>
        Command: _FILLET
      </div>

      <strong>
        {commandFirstIndex === null
          ? "FILLET Select first object"
          : "FILLET Select second object"}
      </strong>
    </>
  ) : tool === "chamfer" ? (
    <>
      <div>
        Command: _CHAMFER
      </div>

      <strong>
        {commandFirstIndex === null
          ? "CHAMFER Select first object"
          : "CHAMFER Select second object"}
      </strong>
    </>
  ) : tool === "array" ? (
    <>
      <div>
        Command: _ARRAY
      </div>

      <strong>
        ARRAY Select object
      </strong>
    </>
  ) : tool === "explode" ? (
    <>
      <div>
        Command: _EXPLODE
      </div>

      <strong>
        EXPLODE Select object
      </strong>
    </>
  ) : tool === "join" ? (
    <>
      <div>
        Command: _JOIN
      </div>

      <strong>
        JOIN Select objects
      </strong>
    </>
  ) : tool === "select" ? (
    <>
      <div>
        Command: _SELECT
      </div>

      <strong>
        SELECT Select objects
      </strong>
    </>
  ) : (
    <>
      <div>
        Command: _{tool.toUpperCase()}
      </div>

      <strong>
        {tool.toUpperCase()} command
      </strong>
    </>
  )}

</div>

<div className="mobile-command-title">
  <strong>
    {tool === "select" && selectedObject?.type === "line"
      ? "LINE"
      : tool === "select"
        ? "SELECT"
        : tool === "dimension"
          ? "DIMENSION"
          : tool === "radiusDimension"
            ? "RADIUS"
            : tool === "diameterDimension"
              ? "DIAMETER"
             : tool === "angularDimension"
  ? "ANGULAR"
  : tool === "quickMeasure"
    ? "QUICK MEASURE"
    : tool.toUpperCase()}
  </strong>

  <span>
    {tool === "line"
      ? showLineInput
        ? " Enter exact length"
        : lineStart
          ? " Specify next point"
          : " Specify first point"

      : tool === "polyline"
        ? lineStart
          ? " Specify next point"
          : " Specify first point"

      : tool === "measure"
        ? measureStart
          ? " Specify second point"
          : " Specify first point"

      : tool === "dimension"
        ? measureStart
          ? " Specify second point"
          : " Specify first point"

      : tool === "radiusDimension"
        ? " Select circle or arc"

      : tool === "diameterDimension"
        ? " Select circle or arc"

      : tool === "angularDimension"
        ? " Select two lines"

      : tool === "area"
        ? " Select closed object"

      : tool === "rectangle"
        ? " Specify first corner"

      : tool === "circle"
        ? " Specify center point"

      : tool === "arc"
        ? " Specify center point"

      : tool === "text"
        ? " Specify insertion point"

      : tool === "hatch"
        ? " Select boundary"

      : tool === "move"
        ? " Select base point"

      : tool === "copy"
        ? " Specify base point"

      : tool === "rotate"
        ? " Specify base point"

      : tool === "trim"
        ? " Select cutting edge or object"

      : tool === "extend"
        ? " Select boundary or object"

      : tool === "stretch"
        ? " Select objects"

      : tool === "offset"
        ? " Specify distance"

      : tool === "mirror"
        ? " Select objects"

      : tool === "scale"
        ? " Specify base point"

      : tool === "fillet"
        ? " Select first object"

      : tool === "chamfer"
        ? " Select first object"

      : tool === "array"
        ? " Select objects"

      : tool === "explode"
        ? " Select object"

          : tool === "break"
       ? " Select object"

      : tool === "join"
        ? " Select objects to join"

      : ""}
  </span>
</div>
  <div className="mobile-quick-actions">

  {/* =====================================================
     MOBILE HOME
  ===================================================== */}

  {mobileCommandPanel === "home" && (
    <>

  {/* SELECT */}

<button
  type="button"
  title="Select objects"
  aria-label="Select objects"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setShowMobileLayers(false);
    setShowMobileTrace(false);
    setShowMobileViews(false);
    setShowMobileBlocks(false);
    setShowMobileAttachments(false);
    setShowMobileSettings(false);

    setCommandText("");

    changeTool("select");
    setMobileCommandPanel("select");
  }}
>
  🎯 Select
</button>

    {/* FIND — WORKING */}

<button
  type="button"
  title="Find objects"
  aria-label="Find objects"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setShowMobileLayers(false);
    setCommandText("");

    openMobilePanel("find");
  }}
>
  🔍 Find
</button>

  {/* MEASURE — WORKING */}

<button
  type="button"
  title="Measurement tools"
  aria-label="Measurement tools"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setShowMobileLayers(false);
    setCommandText("");

    openMobilePanel("measure");
  }}
>
  📏 Measure
</button>

      {/* DRAW */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setShowMobileLayers(false);
          setCommandText("");

          openMobilePanel("draw");
        }}
      >
        ✏️ Draw
      </button>

      {/* MODIFY */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setShowMobileLayers(false);
          setCommandText("");

          openMobilePanel("modify");
        }}
      >
        🛠 Modify
      </button>

      {/* QUICK ANNOTATE */}
<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setShowMobileLayers(false);
    setCommandText("");

    selectMobileTool("text");
  }}
>
  📝 Annotate
</button>

      {/* QUICK TRIM */}
<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setShowMobileLayers(false);
    setCommandText("");

    selectMobileTool("trim");
  }}
>
  ✂️ Quick Trim
</button>

{/* QUICK DIMENSION */}
<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setShowMobileLayers(false);
    setCommandText("");

    selectMobileTool("dimension");
  }}
>
  📐 Quick Dimension
</button>

      {/* LAYERS */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setShowMobileLayers(true);
          setCommandText("");
          setMobileCommandPanel("home");
        }}
      >
        🗂 Layers
      </button>

      {/* PROPERTIES */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          setShowMobileLayers(false);
          setShowMobileProperties(true);
          setMobileCommandPanel("home");
          setCommandText("");
        }}
      >
        ⚙ Properties
      </button>

      {/* =================================================
         SELECTED OBJECT ACTIONS
      ================================================= */}

      {/* DELETE */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          deleteSelected();
          setShowMobileProperties(false);
        }}
      >
        🗑 Delete
      </button>

      {/* DUPLICATE */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          duplicateSelected();
        }}
      >
        🧬 Duplicate
      </button>

      {/* MOVE */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          selectMobileTool("move");
        }}
      >
        ✥ Move
      </button>

      {/* COPY */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          selectMobileTool("copy");
        }}
      >
        📋 Copy
      </button>

      {/* CUT */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          cutDrawing();
        }}
      >
        ✂ Cut
      </button>

      {/* PASTE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          pasteDrawing();
        }}
      >
        📥 Paste
      </button>

      {/* SIMILAR */}
      <button
        type="button"
        disabled={
          selectedIndex === null ||
          !selectedObject
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null ||
            !selectedObject
          ) {
            return;
          }

          const indexes = objects
            .map((object, index) =>
              object?.type === selectedObject.type
                ? index
                : null
            )
            .filter((index) => index !== null);

          setSelectedIndexes(indexes);

          if (indexes.length > 0) {
            setSelectedIndex(
              indexes[indexes.length - 1]
            );
          }
        }}
      >
        🔎 Similar
      </button>

      {/* ZOOM SELECTED */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          zoomToSelected();
        }}
      >
        🔍 Zoom Selected
      </button>

      {/* FRONT */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          bringToFront();
        }}
      >
        ⬆ Front
      </button>

      {/* BACK */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          sendToBack();
        }}
      >
        ⬇ Back
      </button>

      {/* FORWARD */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          bringForward();
        }}
      >
        ⬆ Forward
      </button>

      {/* ISOLATE */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          isolateSelectedLayer();
        }}
      >
        👁 Isolate
      </button>

      {/* ALL LAYERS */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          unisolateLayers();
        }}
      >
        👁 All Layers
      </button>

      {/* REVERSE */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          reverseSelectedDirection();
        }}
      >
        ↔ Reverse
      </button>

      {/* INVERT */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          invertSelection();
        }}
      >
        🔄 Invert
      </button>

      {/* LAYER ALL */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectCurrentLayer();
        }}
      >
        📚 Layer All
      </button>

      {/* ACTIVE LAYER */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setSelectedLayerActive();
        }}
      >
        🎯 Active Layer
      </button>

      {/* CLEAR LAYER */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          clearCurrentLayer();
        }}
      >
        🧹 Clear Layer
      </button>

   {/* FULLSCREEN / EXPAND VIEW */}

<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={async (e) => {
    e.stopPropagation();

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      const target = document.documentElement;

      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      } else {
        window.alert("Fullscreen supported nahi hai.");
      }
    } catch (error) {
      console.error("Fullscreen failed:", error);
      window.alert("Fullscreen open nahi hua.");
    }
  }}
  title="Fullscreen / Expand View"
  aria-label="Fullscreen / Expand View"
>
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
  </svg>
</button>

      {/* ZOOM FIT */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          zoomFit();
        }}
      >
        🔍 Zoom Fit
      </button>

      {/* LOCK */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          lockSelectedObjects();
        }}
      >
        🔒 Lock
      </button>

      {/* UNLOCK */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          unlockSelectedObjects();
        }}
      >
        🔓 Unlock
      </button>

      {/* FLIP H */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          flipSelectedHorizontal();
        }}
      >
        ↔ Flip H
      </button>

      {/* FLIP V */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          flipSelectedVertical();
        }}
      >
        ↕ Flip V
      </button>

      {/* WIDTH */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          changeSelectedLineWidth();
        }}
      >
        🖊 Width
      </button>

      {/* LOCK ALL */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          lockAllSelected();
        }}
      >
        🔒 Lock All
      </button>

      {/* UNLOCK ALL */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          unlockAllObjects();
        }}
      >
        🔓 Unlock All
      </button>

      {/* DELETE SELECTED */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          deleteSelectedOnly();
          setShowMobileProperties(false);
        }}
      >
        🗑 Delete Selected
      </button>

      {/* DUPLICATE ALL */}
      <button
        type="button"
        disabled={
          selectedIndex === null &&
          selectedIndexes.length === 0
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null &&
            selectedIndexes.length === 0
          ) {
            return;
          }

          duplicateAllSelected();
        }}
      >
        🧬 Duplicate All
      </button>

      {/* ROTATE 90 */}
      <button
        type="button"
        disabled={
          selectedIndex === null ||
          !selectedObject
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null ||
            !selectedObject
          ) {
            return;
          }

          rotateSelected90();
        }}
      >
        ↻ 90°
      </button>

      {/* ROTATE -90 */}
      <button
        type="button"
        disabled={
          selectedIndex === null ||
          !selectedObject
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null ||
            !selectedObject
          ) {
            return;
          }

          rotateSelectedMinus90();
        }}
      >
        ↺ -90°
      </button>

      {/* ROTATE 180 */}
      <button
        type="button"
        disabled={
          selectedIndex === null ||
          !selectedObject
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null ||
            !selectedObject
          ) {
            return;
          }

          rotateSelected180();
        }}
      >
        ↻ 180°
      </button>

      {/* ROTATE 45 */}
      <button
        type="button"
        disabled={
          selectedIndex === null ||
          !selectedObject
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null ||
            !selectedObject
          ) {
            return;
          }

          rotateSelected45();
        }}
      >
        ↻ 45°
      </button>

      {/* RESET ROTATION */}
      <button
        type="button"
        disabled={
          selectedIndex === null ||
          !selectedObject
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null ||
            !selectedObject
          ) {
            return;
          }

          resetSelectedRotation();
        }}
      >
        🔄 Reset Rotation
      </button>

      {/* EXACT ROTATION */}
      <button
        type="button"
        disabled={
          selectedIndex === null ||
          !selectedObject
        }
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          if (
            selectedIndex === null ||
            !selectedObject
          ) {
            return;
          }

          setExactRotation();
        }}
      >
        🎯 Exact Rotation
      </button>
    </>
  )}

  {/* =====================================================
    MOBILE SELECT MENU
===================================================== */}

{mobileCommandPanel === "select" && (
  <>
    {/* 1. ERASE */}
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();

        const hasSelection =
          selectedIndex !== null ||
          selectedIndexes.length > 0 ||
          selectedMeasurementIndex !== null;

        if (!hasSelection) {
          window.alert(
            "Pehle canvas par object select karo."
          );
          return;
        }

        deleteSelected();
      }}
    >
      🖉 Erase
    </button>

    {/* 2. COPY */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("copy");
      }}
    >
      📋 Copy
    </button>

    {/* 3. MOVE */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("move");
      }}
    >
      ✥ Move
    </button>

    {/* 4. SCALE */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("scale");
      }}
    >
      ⤢ Scale
    </button>

    {/* 5. ARRAY */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("array");
      }}
    >
      ▦ Array
    </button>

    {/* 6. ROTATE */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("rotate");
      }}
    >
      🔄 Rotate
    </button>

    {/* 7. MIRROR */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("mirror");
      }}
    >
      🪞 Mirror
    </button>

    {/* 8. TRIM */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("trim");
      }}
    >
      ✂ Trim
    </button>

    {/* 9. EXTEND */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("extend");
      }}
    >
      ↔ Extend
    </button>

    {/* 10. STRETCH */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("stretch");
      }}
    >
      ↔ Stretch
    </button>

    {/* 11. OFFSET */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("offset");
      }}
    >
      ⬌ Offset
    </button>

    {/* 12. FILLET */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("fillet");
      }}
    >
      ◯ Fillet
    </button>

    {/* 13. CHAMFER */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("chamfer");
      }}
    >
      ◇ Chamfer
    </button>

    {/* 14. EXPLODE */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("explode");
      }}
    >
      💥 Explode
    </button>

    {/* 15. JOIN */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        selectMobileTool("join");
      }}
    >
      🔗 Join
    </button>
  </>
)}

  {/* =====================================================
     MOBILE DRAW
  ===================================================== */}

  {mobileCommandPanel === "draw" && (
    <>

      {/* LINE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("line");
        }}
      >
        ╱ Line
      </button>

      {/* POLYLINE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("polyline");
        }}
      >
        ╱╲ Polyline
      </button>

      {/* RECTANGLE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("rectangle");
        }}
      >
        □ Rectangle
      </button>

      {/* CIRCLE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("circle");
        }}
      >
        ○ Circle
      </button>

      {/* ELLIPSE */}
<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();
    selectMobileTool("ellipse");
  }}
>
  ⬭ Ellipse
</button>

      {/* ARC */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("arc");
        }}
      >
        ◜ Arc
      </button>

      {/* TEXT */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("text");
        }}
      >
        T Text
      </button>

      {/* HATCH */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("hatch");
        }}
      >
        ▧ Hatch
      </button>

      {/* BACK */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          closeMobilePanel();
        }}
      >
        ← Back
      </button>
    </>
  )}

  {/* =====================================================
     MOBILE MEASURE
  ===================================================== */}

  {mobileCommandPanel === "measure" && (
    <>

      {/* DISTANCE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setCommandText("");
          setMobileCommandPanel("measure");

          changeTool("measure");
        }}
      >
        📏 Distance
      </button>

      {/* DIMENSION */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setCommandText("");
          setMobileCommandPanel("measure");

          changeTool("dimension");
        }}
      >
        📐 Dimension
      </button>

      {/* RADIUS */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setCommandText("");
          setMobileCommandPanel("measure");

          changeTool("radiusDimension");
        }}
      >
        R Radius
      </button>

      {/* DIAMETER */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setCommandText("");
          setMobileCommandPanel("measure");

          changeTool("diameterDimension");
        }}
      >
        Ø Diameter
      </button>

      {/* ANGLE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setCommandText("");
          setMobileCommandPanel("measure");

          changeTool("angularDimension");
        }}
      >
        ∠ Angle
      </button>

      {/* AREA */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setShowMobileProperties(false);
          setCommandText("");
          setMobileCommandPanel("measure");

          changeTool("area");
        }}
      >
        ▣ Area
      </button>

      {/* VOLUME */}
<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setCommandText("");
    setMobileCommandPanel("measure");

    changeTool("volume");
  }}
>
  ▰ Volume
</button>

{/* QUICK MEASURE */}
<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setShowMobileProperties(false);
    setCommandText("");

    selectMobileTool("quickMeasure");
  }}
>
  ↔ Quick
</button>

{/* MODE / UNITS */}
<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    const selectedUnit = window.prompt(
      "Measurement mode:\nEnter mm, inch, or ft-in",
      unit
    );

    if (selectedUnit === null) {
      return;
    }

    const normalizedUnit =
      selectedUnit.trim().toLowerCase();

    if (
      ["mm", "inch", "ft-in"].includes(normalizedUnit)
    ) {
      setUnit(normalizedUnit);

      window.alert(
        `Measurement mode set to ${normalizedUnit}`
      );
    } else {
      window.alert(
        "Invalid mode. Enter mm, inch, or ft-in."
      );
    }
  }}
>
  ⚙ Mode
</button>

{/* EXIT MEASURE */}
<button
  type="button"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.stopPropagation();

    setCommandText("");
    setMeasureStart(null);
    setAnglePoints([]);
    setSelectedMeasurementIndex(null);

    setMobileCommandPanel("home");

    changeTool("select");
  }}
>
  🚪 Exit Measure
</button>

      {/* BACK */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setCommandText("");
          setMobileCommandPanel("home");
        }}
      >
        ← Back
      </button>
    </>
  )}

  {/* =====================================================
     MOBILE MODIFY
  ===================================================== */}

  {mobileCommandPanel === "modify" && (
    <>

      {/* MOVE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("move");
        }}
      >
        ✥ Move
      </button>

      {/* COPY */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("copy");
        }}
      >
        📋 Copy
      </button>

      {/* ROTATE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("rotate");
        }}
      >
        🔄 Rotate
      </button>

      {/* TRIM */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("trim");
        }}
      >
        ✂ Trim
      </button>

      {/* EXTEND */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("extend");
        }}
      >
        ↔ Extend
      </button>

      {/* STRETCH */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("stretch");
        }}
      >
        ↔ Stretch
      </button>

      {/* OFFSET */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("offset");
        }}
      >
        ⬌ Offset
      </button>

      {/* MIRROR */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("mirror");
        }}
      >
        🪞 Mirror
      </button>

      {/* SCALE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("scale");
        }}
      >
        ⤢ Scale
      </button>

      {/* FILLET */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("fillet");
        }}
      >
        ◯ Fillet
      </button>

      {/* CHAMFER */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("chamfer");
        }}
      >
        ◇ Chamfer
      </button>

      {/* ARRAY */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("array");
        }}
      >
        ▦ Array
      </button>

      {/* EXPLODE */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("explode");
        }}
      >
        💥 Explode
      </button>

      {/* JOIN */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          selectMobileTool("join");
        }}
      >
        🔗 Join
      </button>

      {/* BACK */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          closeMobilePanel();
        }}
      >
        ← Back
      </button>
    </>
  )}

  {/* =====================================================
     MOBILE FIND
  ===================================================== */}

  {mobileCommandPanel === "find" && (
    <>

      <input
        type="text"
        value={commandText}
        placeholder="Find object"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onChange={(e) => {
          setCommandText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();

            runMobileFind();
          }
        }}
      />

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          runMobileFind();
        }}
      >
        🔍 Find
      </button>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();

          setCommandText("");
          closeMobilePanel();
        }}
      >
        ← Back
      </button>

    </>
  )}

<div className="mobile-command-status">

  {tool === "line" ? (
    <>
      <div>Command: _LINE</div>

      <strong>
        {showLineInput
          ? "LINE Specify distance / angle"
          : linePreview && lineStart
            ? (() => {
                const dx =
                  linePreview.x2 -
                  linePreview.x1;

                const dy =
                  linePreview.y2 -
                  linePreview.y1;

                const distance =
                  Math.hypot(dx, dy);

                let angle =
                  Math.atan2(dy, dx) *
                  (180 / Math.PI);

                if (angle < 0) {
                  angle += 360;
                }

                return `LINE  Length: ${Math.round(
                  distance
                )}    Angle: ${angle.toFixed(
                  1
                )}°`;
              })()
            : lineStart
              ? "LINE Specify next point"
              : "LINE Specify first point"}
      </strong>
    </>
  ) : tool === "polyline" ? (
    <>
      <div>Command: _PLINE</div>

      <strong>
        {lineStart
          ? "POLYLINE Specify next point"
          : "POLYLINE Specify first point"}
      </strong>
    </>
  ) : tool === "measure" ? (
    <>
      <div>Command: _MEASUREGEOM</div>

      <strong>
        {measureStart
          ? "MEASURE Specify second point"
          : "MEASURE Specify first point"}
      </strong>
    </>
  ) : tool === "dimension" ? (
    <>
      <div>Command: _DIMENSION</div>

      <strong>
        {measureStart
          ? "DIMENSION Specify second point"
          : "DIMENSION Specify first point"}
      </strong>
    </>
  ) : tool === "radiusDimension" ? (
    <>
      <div>Command: _RADIUS</div>

      <strong>
        RADIUS Select circle or arc
      </strong>
    </>
  ) : tool === "diameterDimension" ? (
    <>
      <div>Command: _DIAMETER</div>

      <strong>
        DIAMETER Select circle or arc
      </strong>
    </>
  ) : tool === "angularDimension" ? (
    <>
      <div>Command: _ANGULAR</div>

      <strong>
        ANGLE Select two lines
      </strong>
    </>
  ) : tool === "area" ? (
    <>
      <div>Command: _AREA</div>

      <strong>
        {commandText.trim()
          ? commandText
          : "AREA Select closed object"}
      </strong>
    </>
  ) : tool === "rectangle" ? (
    <>
      <div>Command: _RECTANGLE</div>

      <strong>
        RECTANGLE Specify first corner
      </strong>
    </>
  ) : tool === "circle" ? (
    <>
      <div>Command: _CIRCLE</div>

      <strong>
        CIRCLE Specify center point
      </strong>
    </>
  ) : tool === "arc" ? (
    <>
      <div>Command: _ARC</div>

      <strong>
        ARC Specify center point
      </strong>
    </>
  ) : tool === "text" ? (
    <>
      <div>Command: _TEXT</div>

      <strong>
        TEXT Specify insertion point
      </strong>
    </>
  ) : tool === "hatch" ? (
    <>
      <div>Command: _HATCH</div>

      <strong>
        HATCH Select boundary
      </strong>
    </>
  ) : tool === "move" ? (
    <>
      <div>Command: _MOVE</div>

      <strong>
        MOVE Select base point
      </strong>
    </>
  ) : tool === "copy" ? (
    <>
      <div>Command: _COPY</div>

      <strong>
        COPY Specify base point
      </strong>
    </>
  ) : tool === "rotate" ? (
    <>
      <div>Command: _ROTATE</div>

      <strong>
        ROTATE Specify base point
      </strong>
    </>
  ) : tool === "trim" ? (
    <>
      <div>Command: _TRIM</div>

      <strong>
        TRIM Select cutting edge or object
      </strong>
    </>
  ) : tool === "extend" ? (
    <>
      <div>Command: _EXTEND</div>

      <strong>
        EXTEND Select boundary or object
      </strong>
    </>
  ) : tool === "stretch" ? (
    <>
      <div>Command: _STRETCH</div>

      <strong>
        STRETCH Select objects
      </strong>
    </>
  ) : tool === "offset" ? (
    <>
      <div>Command: _OFFSET</div>

      <strong>
        OFFSET Specify distance
      </strong>
    </>
  ) : tool === "mirror" ? (
    <>
      <div>Command: _MIRROR</div>

      <strong>
        MIRROR Select objects
      </strong>
    </>
  ) : tool === "scale" ? (
    <>
      <div>Command: _SCALE</div>

      <strong>
        SCALE Specify base point
      </strong>
    </>
  ) : tool === "fillet" ? (
    <>
      <div>Command: _FILLET</div>

      <strong>
        FILLET Select first object
      </strong>
    </>
  ) : tool === "chamfer" ? (
    <>
      <div>Command: _CHAMFER</div>

      <strong>
        CHAMFER Select first object
      </strong>
    </>
  ) : tool === "array" ? (
    <>
      <div>Command: _ARRAY</div>

      <strong>
        ARRAY Select objects
      </strong>
    </>
  ) : tool === "explode" ? (
    <>
      <div>Command: _EXPLODE</div>

      <strong>
        EXPLODE Select object
      </strong>
    </>
  ) : tool === "join" ? (
    <>
      <div>Command: _JOIN</div>

      <strong>
        JOIN Select objects to join
      </strong>
    </>
  ) : tool === "select" ? (
    <>
      <div>Command: _SELECT</div>

      <strong>
        SELECT Select objects
      </strong>
    </>
  ) : (
    <>
      <div>
        Command: _{tool.toUpperCase()}
      </div>

      <strong>
        {tool.toUpperCase()} command
      </strong>
    </>
  )}

</div>

{/* =====================================================
    MOBILE COMMAND CONTROLS
===================================================== */}

<div
  className="mobile-command-controls"
  onPointerDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  onTouchMove={(e) => e.stopPropagation()}
  onTouchEnd={(e) => e.stopPropagation()}
>

  {/* =========================
    CLOSE ACTIVE COMMAND
========================= */}

{(tool === "line" || tool === "polyline") &&
  lineStart && (
    <button
      type="button"
    onClick={(e) => {
  e.stopPropagation();

  if (tool === "polyline") {
    closeActivePolyline();
    return;
  }

  setLineStart(null);
  setLinePreview(null);
  setPendingLinePoint(null);
  setLineLengthInput("");
  setShowLineInput(false);
  setIsDrawing(false);
  setSnapPoint(null);
  setSnapType("");
  actionStartRef.current = null;
  setCommandText("");
  setMobileCommandPanel("home");
  changeTool("select");
}}
    >
      Close
    </button>
)}



{/* =========================
    UNDO
========================= */}

<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();

    /* LINE — REMOVE LAST SEGMENT */
    if (
      tool === "line" &&
      undoActiveLineSegment()
    ) {
      return;
    }

   
/* POLYLINE — REMOVE LAST SEGMENT */

if (
  tool === "polyline" &&
  undoActiveLineSegment()
) {
  return;
}



    /* NORMAL UNDO */
    try {
      undo();
    } catch (error) {
      console.error("Undo failed:", error);
    }
  }}
  disabled={
    tool === "line"
      ? false
      : tool === "polyline" && isDrawing
        ? false
        : past.length === 0
  }
>
  ↶ Undo
</button>

    {/* =========================
      REDO
  ========================= */}

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();

      try {
        redo();
      } catch (error) {
        console.error(
          "Redo failed:",
          error
        );
      }
    }}
    disabled={future.length === 0}
  >
    ↷ Redo
  </button>


{/* =========================
    ESC
========================= */}

<button
  type="button"
  className="mobile-command-esc"
  onClick={(e) => {
    e.stopPropagation();

    // CLEAR ACTIVE LINE / POLYLINE
    setLineStart(null);
    setLinePreview(null);
    setPendingLinePoint(null);
    setLineLengthInput("");
    setShowLineInput(false);
    setIsDrawing(false);

    // CLEAR MEASUREMENTS
    setMeasureStart(null);
    setAnglePoints([]);

    // CLEAR SNAP
    setSnapType("");
    setSnapPoint(null);

    // CLEAR SELECTION
    setSelectedIndex(null);
    setSelectedIndexes([]);
    setSelectedMeasurementIndex(null);
    setCommandFirstIndex(null);

    // CLEAR ACTIVE ACTIONS
    actionStartRef.current = null;
    moveStartRef.current = null;
    stretchStartRef.current = null;

    // CLOSE MOBILE PANELS
    setShowMobileProperties(false);
    setShowMobileLayers(false);

    // RESET COMMAND
    setCommandText("");
    setMobileCommandPanel("home");

    // RETURN TO SELECT
    changeTool("select");
  }}
>
  ESC
</button>


  {/* =========================
      FIND
  ========================= */}

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();

      setCommandText("");
      openMobilePanel("find");
    }}
  >
    🔍 Find
  </button>


  {/* =========================
      COMMAND INPUT
  ========================= */}

  <input
    type="text"
    inputMode={
      showLineInput
        ? "decimal"
        : "text"
    }
    value={
      showLineInput
        ? lineLengthInput
        : commandText
    }
    autoFocus={showLineInput}

    onChange={(e) => {
      if (showLineInput) {
        setLineLengthInput(
          e.target.value
        );
      } else {
        setCommandText(
          e.target.value
        );
      }
    }}

    onKeyDown={(e) => {
      if (e.key !== "Enter") {
        return;
      }

      e.preventDefault();

      /* LINE LENGTH */
      if (showLineInput) {
        confirmLineInput();
        return;
      }

      const command =
        commandText
          .trim()
          .toLowerCase();

      if (!command) {
        return;
      }

    const toolMap = {
  /* BASIC DRAWING */
  select: "select",
  s: "select",

  line: "line",
  l: "line",
  ln: "line",

  polyline: "polyline",
  pl: "polyline",
  pline: "polyline",

  spline: "spline",
  spl: "spline",

  arc: "arc",

  ellipse: "ellipse",
  ell: "ellipse",

  circle: "circle",
  c: "circle",
  ci: "circle",

  rectangle: "rectangle",
  rec: "rectangle",
  rectang: "rectangle",

  text: "text",
  t: "text",
  dt: "text",

  hatch: "hatch",
  h: "hatch",
  bh: "hatch",

  point: "point",
  po: "point",

  /* MEASURE */
  measure: "measure",
  me: "measure",
  distance: "measure",
  dist: "measure",

  dimension: "dimension",
  dim: "dimension",

  area: "area",
  ar: "area",

  volume: "volume",
  vol: "volume",

  quickmeasure: "quickMeasure",
  quick: "quickMeasure",
  qm: "quickMeasure",

  angulardimension: "angularDimension",
  ang: "angularDimension",

  radiusdimension: "radiusDimension",
  rad: "radiusDimension",

  diameterdimension: "diameterDimension",
  dia: "diameterDimension",

  /* MODIFY */
  move: "move",
  m: "move",
  mv: "move",

  copy: "copy",
  co: "copy",
  cp: "copy",

  rotate: "rotate",
  ro: "rotate",

  trim: "trim",
  tr: "trim",

  extend: "extend",
  ex: "extend",
  ext: "extend",

  stretch: "stretch",
  st: "stretch",

  offset: "offset",
  o: "offset",
  of: "offset",

  mirror: "mirror",
  mi: "mirror",

  scale: "scale",
  sc: "scale",

  fillet: "fillet",
  f: "fillet",

  chamfer: "chamfer",
  cha: "chamfer",

  array: "array",
  arr: "array",

  polararray: "polarArray",
  polar: "polarArray",

  explode: "explode",
  exp: "explode",

  join: "join",
  j: "join",
  jn: "join",

  break: "break",
  br: "break",

  group: "group",
  g: "group",

  ungroup: "ungroup",
  ug: "ungroup",

  /* VIEW */
  zoomfit: "zoomFit",
  zf: "zoomFit",
  ze: "zoomFit",

  zoomin: "zoomIn",
  zi: "zoomIn",

  zoomout: "zoomOut",
  zo: "zoomOut",
};

     
      if (command === "find") {
        setCommandText("");
        openMobilePanel("find");
        return;
      }

      /* =========================
         MOBILE ZOOM COMMANDS
      ========================= */

      if (
        command === "zf" ||
        command === "ze" ||
        command === "zoomfit"
      ) {
        zoomFit();
        setCommandText("");
        return;
      }

      if (
        command === "zi" ||
        command === "zoomin"
      ) {
        setScale((prevScale) =>
          Math.min(prevScale * 1.2, 100)
        );

        setCommandText("");
        return;
      }

      if (
        command === "zo" ||
        command === "zoomout"
      ) {
        setScale((prevScale) =>
          Math.max(prevScale / 1.2, 0.01)
        );

        setCommandText("");
        return;
      }

      /* =========================
         EXECUTE CAD COMMAND
      ========================= */

      const selectedTool = toolMap[command];

      if (!selectedTool) {
        window.alert(
          `Unknown command: ${command}`
        );
        return;
      }

      setCommandText("");
      selectMobileTool(selectedTool);
    
    }}

    placeholder={
      showLineInput
        ? "Length or Length<Angle"
        : "Type a command"
    }
  />


  {/* =========================
      ENTER
  ========================= */}

  <button
  type="button"
  className="mobile-command-enter"
  onClick={(e) => {
      e.stopPropagation();

      if (showLineInput) {
        confirmLineInput();
        return;
      }

     runMobileCommand(commandText);
    }}
  >
    {showLineInput
      ? "✓"
      : "Enter"}
  </button>

</div>

</div>

{commandText.trim() !== "" && (
  <div className="command-suggestions">
  {[
  "Find",
  "Select",
  "S",
  "All",
"SelectAll",
"Last",
"SelectLast",

"None",
"Deselect",
"Unselect",

  "Erase",
"E",
"ER",

  "Undo",
"U",

"Ortho",
"F8",

"Polar",
"Grid",
"Snap",
"OSNAP",
"Dyn",
"Track",

"F1",
"F2",
"F3",
"F7",
"F9",
"F10",
"F11",
"F12",

"Properties",
"Prop",
"PR",
"CTRL+SHIFT+U",

"Layers",
"Layer",
"LA",
"CTRL+SHIFT+K",

"CTRL+SHIFT+J",

"CTRL+SHIFT+V",
"CTRL+SHIFT+W",
"CTRL+SHIFT+B",
"CTRL+SHIFT+Q",
"CTRL+SHIFT+N",
"CTRL+SHIFT+Y",
"CTRL+SHIFT+I",

"CTRL+SHIFT+L",
"CTRL+SHIFT+C",
"CTRL+SHIFT+R",
"CTRL+SHIFT+T",
"CTRL+SHIFT+H",

"CTRL+ALT+M",
"CTRL+ALT+A",
"CTRL+ALT+D",
"CTRL+ALT+G",
"CTRL+ALT+I",
"CTRL+ALT+B",

"Save",
"Open",

"New",
"N",

"Restore",
"R",

"ClearAutoSave",
"CA",

"ExportPNG",
"PNG",
"EP",

"ExportSVG",
"SVG",
"ES",

"ExportDXF",
"DXF",
"ED",

"Redo",
"Y",

"Esc",
"Cancel",

"Close",

"Home",

"ZoomFit",
"ZF",
"ZE",

"ZoomIn",
"ZI",

"ZoomOut",
"ZO",

"Line",
"L",
"LN",

"Circle",
"C",
"CI",

"Rectangle",
"REC",
"RECTANG",

"Text",
"T",
"DT",

"Hatch",
"H",
"BH",

"Polyline",
"PL",
"PLINE",

"Arc",
"ARC",

"Array",
"A",
"ARR", 

 "Measure",
"ME",

"Distance",
"Dist",
"DIST",

"DI",

"Area",
"AR",
"AA",

  "Dimension",
  "DIM",
  "D",

  "AngularDimension",
  "ANG",
  "AD",

  "RadiusDimension",
  "RAD",
  "RD",

"DiameterDimension",
"DIA",
"DD",

 "Move",
"M",
"MV",

"Copy",
"CO",
"CP",

"Rotate",
"RO",
"RT",
"RR",

"Trim",
"TR",
"TRM",

"Extend",
"EX",
"EXT",
"EXD",

"Stretch",
"SST",
"ST",

"Offset",
"O",
"OF",
"OFS",

"Mirror",
"MI",
"MR",

"Scale",
"SC",
"SL",

"Fillet",
"F",
"FIL",

"Chamfer",
"CHA",
"CH",

"Explode",
"X",
"EXP",

"Join",
"J",
"JN",
]
  .filter((command) =>
    command
      .toLowerCase()
      .includes(
        commandText
          .trim()
          .toLowerCase()
      )
  )
  .map((command) => (
    <button
      type="button"
      key={command}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();

        runMobileCommand(command);

        setCommandText("");
      }}
    >
      {command}
    </button>
  ))}
  </div>
)}

</div>

{/* PROPERTIES — NO OBJECT SELECTED */}

{showMobileProperties && !selectedObject && (
  <div
    style={{
      position: "fixed",
      left: "10px",
      right: "10px",
      bottom: "180px",
      zIndex: 1200000,

      background: "#171717",
      color: "#ffffff",
      border: "1px solid #444444",
      borderRadius: "10px",
      padding: "14px",
      boxSizing: "border-box",
    }}
    onPointerDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <strong>Properties</strong>

      <button
        type="button"
        onClick={() => setShowMobileProperties(false)}
      >
        ✕
      </button>
    </div>

    <p style={{ color: "#bbbbbb", fontSize: "14px" }}>
      Select an object to view its properties.
    </p>
  </div>
)}

{/* =========================
    MOBILE TRACE PANEL
========================= */}

{showMobileTrace && (
  <div
    onPointerDown={(e) => e.stopPropagation()}
    onPointerUp={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onTouchMove={(e) => e.stopPropagation()}
    onTouchEnd={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}

    style={{
      position: "fixed",
      left: "10px",
      right: "10px",
      bottom: "180px",
      zIndex: 1200003,

      maxHeight: "55vh",
      overflowY: "auto",
      boxSizing: "border-box",
      padding: "12px",

      background: "#171717",
      color: "#fff",
      border: "1px solid #444",
      borderRadius: "10px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",

      pointerEvents: "auto",
      touchAction: "pan-y",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "8px",
      }}
    >
      <strong>Trace</strong>

      <button
        type="button"
        onClick={closeMobileTracePanel}
      >
        ✕
      </button>
    </div>

    <p
      style={{
        color: "#bbb",
        fontSize: "13px",
        margin: "6px 0 12px",
      }}
    >
      Add markup without changing the original drawing.
    </p>

    <button
      type="button"
      onClick={createMobileTrace}
      style={{
        width: "100%",
        minHeight: "42px",
        marginBottom: "12px",
        background: "#1976a8",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
      }}
    >
      ＋ New Trace
    </button>

    {traceEditMode && (
      <div
        style={{
          padding: "10px",
          marginBottom: "12px",
          background: "#183344",
          borderRadius: "6px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>
          Editing:{" "}
          {mobileTraceList.find(
            (trace) => trace.id === activeTraceId
          )?.name || "Trace"}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#b9dff3",
            marginBottom: "10px",
          }}
        >
          Finger se canvas par draw karo.
        </div>

        <button
          type="button"
          onClick={finishMobileTrace}
          style={{
            width: "100%",
            minHeight: "40px",
            background: "#238751",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
          }}
        >
          ✓ Finish Trace
        </button>
      </div>
    )}

    {mobileTraceList.length === 0 && (
      <div
        style={{
          color: "#aaa",
          fontSize: "13px",
          padding: "8px 0",
        }}
      >
        Abhi koi trace nahi hai. New Trace dabao.
      </div>
    )}

    {mobileTraceList.map((trace) => (
      <div
        key={trace.id}
        style={{
          padding: "10px",
          marginBottom: "8px",
          background: "#242424",
          border: "1px solid #444",
          borderRadius: "6px",
        }}
      >
        <strong>{trace.name}</strong>

        <div
          style={{
            fontSize: "12px",
            color: "#aaa",
            marginTop: "4px",
            marginBottom: "8px",
          }}
        >
          {(trace.strokes || []).length} markup stroke(s)
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <button
            type="button"
            onClick={() => openMobileTrace(trace)}
          >
            View
          </button>

          <button
            type="button"
            onClick={() => editMobileTrace(trace)}
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => deleteMobileTrace(trace.id)}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
)}

{/* =========================
    MOBILE VIEWS PANEL
========================= */}

{showMobileViews && (
  <div
    onPointerDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "fixed",
      left: "10px",
      right: "10px",
      bottom: "180px",
      zIndex: 1200004,

      padding: "14px",
      boxSizing: "border-box",
      background: "#171717",
      color: "#ffffff",
      border: "1px solid #444444",
      borderRadius: "10px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",

      maxHeight: "55vh",
      overflowY: "auto",
      pointerEvents: "auto",
    }}
  >
    {/* PANEL HEADER */}

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
      }}
    >
      <strong>Views</strong>

      <button
        type="button"
        onClick={() => setShowMobileViews(false)}
      >
        ✕
      </button>
    </div>

    {/* CURRENT MODEL SPACE */}

    <button
      type="button"
      onClick={() => {
        setShowMobileViews(false);
      }}
      style={{
        width: "100%",
        minHeight: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        marginBottom: "8px",

        color: "#ffffff",
        background: "#183344",
        border: "1px solid #279bce",
        borderRadius: "6px",
        textAlign: "left",
      }}
    >
      <span>▦ Model Space</span>
      <span style={{ color: "#62c8f5" }}>✓ Current</span>
    </button>

    {/* PAPER SPACE STATUS */}

    <div
      style={{
        padding: "12px",
        background: "#242424",
        border: "1px solid #444444",
        borderRadius: "6px",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "6px" }}>
        ▱ Paper Layouts
      </div>

      <div
        style={{
          color: "#b5b5b5",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        Layout 1 / Layout 2 abhi MyCAD mein implement nahi
        hue hain. Inke liye alag paper-space canvas aur
        viewport system banana hoga.
      </div>
    </div>
  </div>
)}

{/* =========================
    MOBILE BLOCKS PANEL
========================= */}

{showMobileBlocks && (
  <div
    onPointerDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "fixed",
      left: "10px",
      right: "10px",
      bottom: "180px",
      zIndex: 1200005,

      padding: "12px",
      boxSizing: "border-box",
      background: "#171717",
      color: "#fff",
      border: "1px solid #444",
      borderRadius: "10px",
      maxHeight: "55vh",
      overflowY: "auto",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      pointerEvents: "auto",
    }}
  >
    {/* HEADER */}

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
      }}
    >
      <strong>Blocks</strong>

      <button
        type="button"
        onClick={() => setShowMobileBlocks(false)}
      >
        ✕
      </button>
    </div>

    {/* CREATE BLOCK FROM SELECTION */}

    <button
      type="button"
      onClick={() => {
        const pickedIndexes =
          selectedIndexes.length > 0
            ? [...selectedIndexes]
            : selectedIndex !== null
              ? [selectedIndex]
              : [];

        const validIndexes = pickedIndexes.filter(
          (index) =>
            index >= 0 &&
            index < objects.length &&
            objects[index]
        );

        if (validIndexes.length === 0) {
          window.alert(
            "Pehle canvas par object select karo."
          );
          return;
        }

        const lockedIndex = validIndexes.find(
          (index) => isObjectLocked(index)
        );

        if (lockedIndex !== undefined) {
          window.alert(
            "Selected objects mein locked object hai."
          );
          return;
        }

        const suggestedName =
          `Block ${Array.from(
            new Set(
              objects
                .map((object) => object?.blockId)
                .filter(Boolean)
            )
          ).length + 1}`;

        const enteredName = window.prompt(
          "Block ka naam:",
          suggestedName
        );

        if (enteredName === null) return;

        const blockName =
          enteredName.trim() || suggestedName;

        const blockId =
          `block-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 7)}`;

        saveHistory(
          [...objects],
          [...measurements]
        );

        setObjects((previous) =>
          previous.map((object, index) =>
            validIndexes.includes(index)
              ? {
                  ...object,
                  blockId,
                  blockName,
                  groupId: blockId,
                }
              : object
          )
        );

        setSelectedIndexes(validIndexes);
        setSelectedIndex(
          validIndexes[validIndexes.length - 1]
        );
        setFuture([]);
      }}
      style={{
        width: "100%",
        minHeight: "44px",
        marginBottom: "12px",
        background: "#1976a8",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
      }}
    >
      ＋ Create Block from Selection
    </button>

    {/* EXISTING BLOCKS */}

    {Array.from(
      new Set(
        objects
          .map((object) => object?.blockId)
          .filter(Boolean)
      )
    ).map((blockId) => {
      const members = objects.filter(
        (object) => object?.blockId === blockId
      );

      const firstObject = members[0];

      const blockName =
        firstObject?.blockName || "Unnamed Block";

      const selectThisBlock = () => {
        const indexes = objects
          .map((object, index) =>
            object?.blockId === blockId
              ? index
              : -1
          )
          .filter((index) => index >= 0);

        setSelectedIndexes(indexes);
        setSelectedIndex(
          indexes.length > 0
            ? indexes[indexes.length - 1]
            : null
        );

        changeTool("select");
        setShowMobileBlocks(false);
      };

      const renameThisBlock = () => {
        const nextName = window.prompt(
          "Block ka naya naam:",
          blockName
        );

        if (nextName === null) return;

        const trimmedName = nextName.trim();

        if (!trimmedName) {
          window.alert("Block ka naam khali nahi ho sakta.");
          return;
        }

        saveHistory(
          [...objects],
          [...measurements]
        );

        setObjects((previous) =>
          previous.map((object) =>
            object?.blockId === blockId
              ? {
                  ...object,
                  blockName: trimmedName,
                }
              : object
          )
        );

        setFuture([]);
      };

      const deleteThisBlock = () => {
        const confirmed = window.confirm(
          `Block "${blockName}" ke objects delete karne hain?`
        );

        if (!confirmed) return;

        saveHistory(
          [...objects],
          [...measurements]
        );

        setObjects((previous) =>
          previous.filter(
            (object) => object?.blockId !== blockId
          )
        );

        setSelectedIndex(null);
        setSelectedIndexes([]);
        setFuture([]);
      };

      return (
        <div
          key={blockId}
          style={{
            padding: "10px",
            marginBottom: "8px",
            background: "#242424",
            border: "1px solid #444",
            borderRadius: "6px",
          }}
        >
          <strong>{blockName}</strong>

          <div
            style={{
              color: "#aaa",
              fontSize: "12px",
              marginTop: "4px",
              marginBottom: "9px",
            }}
          >
            {members.length} object(s)
          </div>

          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={selectThisBlock}>
              Select
            </button>

            <button type="button" onClick={renameThisBlock}>
              Rename
            </button>

            <button type="button" onClick={deleteThisBlock}>
              Delete
            </button>
          </div>
        </div>
      );
    })}

    {!objects.some((object) => object?.blockId) && (
      <div
        style={{
          color: "#aaa",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        Abhi koi block nahi hai. Pehle canvas par objects
        select karke “Create Block from Selection” dabao.
      </div>
    )}
  </div>
)}

{/* =========================
    MOBILE ATTACHMENTS PANEL
========================= */}

{showMobileAttachments && (
  <div
    onPointerDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "fixed",
      left: "10px",
      right: "10px",
      bottom: "180px",
      zIndex: 1200006,

      padding: "12px",
      boxSizing: "border-box",
      background: "#171717",
      color: "#fff",
      border: "1px solid #444",
      borderRadius: "10px",
      maxHeight: "55vh",
      overflowY: "auto",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      pointerEvents: "auto",
    }}
  >
    {/* HEADER */}

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
      }}
    >
      <strong>Attachments / References</strong>

      <button
        type="button"
        onClick={() => setShowMobileAttachments(false)}
      >
        ✕
      </button>
    </div>

    {/* HIDDEN FILE INPUT */}

    <input
      ref={attachmentInputRef}
      type="file"
      accept="image/*,application/pdf"
      onChange={handleMobileAttachment}
      style={{ display: "none" }}
    />

    {/* ATTACH BUTTON */}

    <button
      type="button"
      onClick={() => attachmentInputRef.current?.click()}
      style={{
        width: "100%",
        minHeight: "44px",
        marginBottom: "12px",
        background: "#1976a8",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
      }}
    >
      📎 Attach Image / PDF
    </button>

    {/* EMPTY STATE */}

    {mobileAttachments.length === 0 && (
      <div
        style={{
          color: "#aaa",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        Abhi koi file attach nahi hai. Upar wale button
        se image ya PDF select karo.
      </div>
    )}

    {/* ATTACHMENT LIST */}

    {mobileAttachments.map((attachment) => (
      <div
        key={attachment.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px",
          marginBottom: "8px",
          background: "#242424",
          border: "1px solid #444",
          borderRadius: "6px",
          minWidth: 0,
        }}
      >
        {attachment.type.startsWith("image/") ? (
          <img
            src={attachment.dataUrl}
            alt=""
            style={{
              width: "48px",
              height: "48px",
              objectFit: "cover",
              borderRadius: "4px",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: "#343434",
              borderRadius: "4px",
              color: "#80ccf2",
              fontSize: "14px",
            }}
          >
            PDF
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              overflowWrap: "anywhere",
              marginBottom: "4px",
            }}
          >
            {attachment.name}
          </div>

          <div style={{ fontSize: "11px", color: "#aaa" }}>
            {(attachment.size / 1024).toFixed(0)} KB
          </div>

          <a
            href={attachment.dataUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              marginTop: "6px",
              color: "#63c4f3",
              fontSize: "13px",
            }}
          >
            Open file
          </a>
        </div>

        <button
          type="button"
          title="Remove attachment"
          onClick={() => {
            const confirmed = window.confirm(
              `"${attachment.name}" attachment remove karein?`
            );

            if (!confirmed) return;

            setMobileAttachments((previous) =>
              previous.filter(
                (item) => item.id !== attachment.id
              )
            );
          }}
        >
          🗑
        </button>
      </div>
    ))}
  </div>
)}

{/* =========================
    MOBILE SETTINGS PANEL
========================= */}

{showMobileSettings && (
  <div
    onPointerDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "fixed",
      left: "10px",
      right: "10px",
      bottom: "180px",
      zIndex: 1200007,

      padding: "14px",
      boxSizing: "border-box",
      background: "#171717",
      color: "#fff",
      border: "1px solid #444",
      borderRadius: "10px",
      maxHeight: "55vh",
      overflowY: "auto",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      pointerEvents: "auto",
    }}
  >
    {/* HEADER */}

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "14px",
      }}
    >
      <strong>Drawing Settings</strong>

      <button
        type="button"
        onClick={() => setShowMobileSettings(false)}
      >
        ✕
      </button>
    </div>

    {/* SETTINGS TOGGLE */}

    {[
      {
        label: "Grid",
        description: "Canvas grid show / hide",
        enabled: gridEnabled,
        toggle: () =>
          setGridEnabled((previous) => !previous),
      },
      {
        label: "Grid Snap",
        description: "Cursor ko grid points par snap karo",
        enabled: gridSnapEnabled,
        toggle: () =>
          setGridSnapEnabled((previous) => !previous),
      },
      {
        label: "Ortho",
        description: "Straight horizontal / vertical drawing",
        enabled: orthoEnabled,
        toggle: () =>
          setOrthoEnabled((previous) => !previous),
      },
      {
        label: "Polar Tracking",
        description: "Fixed angles par drawing guide",
        enabled: polarEnabled,
        toggle: () =>
          setPolarEnabled((previous) => !previous),
      },
      {
        label: "Dynamic Input",
        description: "Drawing ke dauran live input",
        enabled: dynamicInputEnabled,
        toggle: () =>
          setDynamicInputEnabled((previous) => !previous),
      },
      {
        label: "Object Snap Tracking",
        description: "Object snap points se alignment",
        enabled: objectSnapTrackingEnabled,
        toggle: () =>
          setObjectSnapTrackingEnabled((previous) => !previous),
      },
    ].map((setting) => (
      <div
        key={setting.label}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "11px 0",
          borderBottom: "1px solid #353535",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>
            {setting.label}
          </div>

          <div
            style={{
              color: "#aaa",
              fontSize: "11px",
              marginTop: "4px",
              lineHeight: 1.4,
            }}
          >
            {setting.description}
          </div>
        </div>

        <button
          type="button"
          aria-pressed={setting.enabled}
          onClick={setting.toggle}
          style={{
            minWidth: "66px",
            minHeight: "34px",
            padding: "6px 10px",
            border: "none",
            borderRadius: "18px",
            background: setting.enabled
              ? "#1976a8"
              : "#444",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {setting.enabled ? "ON" : "OFF"}
        </button>
      </div>
    ))}

    {/* POLAR ANGLE */}

    <div
      style={{
        marginTop: "14px",
        padding: "10px",
        background: "#242424",
        borderRadius: "6px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        Polar Angle Step
      </div>

      <div style={{ display: "flex", gap: "6px" }}>
        {[15, 30, 45, 90].map((angle) => (
          <button
            key={angle}
            type="button"
            onClick={() => setPolarAngleStep(angle)}
            style={{
              flex: 1,
              minHeight: "38px",
              border: "1px solid #555",
              borderRadius: "5px",
              background:
                polarAngleStep === angle
                  ? "#1976a8"
                  : "#333",
              color: "#fff",
            }}
          >
            {angle}°
          </button>
        ))}
      </div>
    </div>
  </div>
)}


{showMobileProperties &&
  selectedObject && (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{
        position: "fixed",
        left: "10px",
        right: "10px",
        bottom: "180px",
        zIndex: 1200000,
        background: "#171717",
        color: "#fff",
        border: "1px solid #444",
        borderRadius: "10px",
        padding: "12px",
        maxHeight: "55vh",
        overflowY: "auto",
        boxSizing: "border-box",
        pointerEvents: "auto",
        touchAction: "pan-y",
      }}
    >
      {/* =========================
          HEADER
      ========================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <strong>
          ⚙ Properties — {selectedObject.type}
        </strong>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMobileProperties(false);
          }}
        >
          ✕
        </button>
      </div>

      {/* =========================
          OBJECT COLOR
      ========================= */}

      <label
        style={{
          display: "block",
          marginBottom: "5px",
          fontSize: "12px",
          color: "#aaa",
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
        onChange={(event) => {
          updateSelectedObject(
            "color",
            event.target.value
          );
        }}
        style={{
          width: "100%",
          height: "42px",
          marginBottom: "12px",
        }}
      />

      {/* =========================
          HATCH PROPERTIES
      ========================= */}

      {selectedObject.type === "hatch" && (
        <>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            Hatch Spacing
          </label>

          <input
            type="number"
            min="4"
            value={
              selectedObject.hatchSpacing ??
              12
            }
            onChange={(event) => {
              const value = Math.max(
                4,
                Number(
                  event.target.value
                ) || 4
              );

              updateSelectedObject(
                "hatchSpacing",
                value
              );
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: "42px",
              marginBottom: "12px",
              padding: "8px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "6px",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            Hatch Angle
          </label>

          <input
            type="number"
            min="0"
            max="360"
            value={
              selectedObject.hatchAngle ??
              45
            }
            onChange={(event) => {
              let value =
                Number(
                  event.target.value
                );

              if (!Number.isFinite(value)) {
                value = 45;
              }

              value = Math.max(
                0,
                Math.min(360, value)
              );

              updateSelectedObject(
                "hatchAngle",
                value
              );
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: "42px",
              marginBottom: "12px",
              padding: "8px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "6px",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            Hatch Color
          </label>

          <input
            type="color"
            value={
              selectedObject.hatchColor ||
              "#00aaff"
            }
            onChange={(event) => {
              updateSelectedObject(
                "hatchColor",
                event.target.value
              );
            }}
            style={{
              width: "100%",
              height: "42px",
              marginBottom: "12px",
            }}
          />
        </>
      )}

      {/* =========================
          LINE WIDTH
      ========================= */}

      <label
        style={{
          display: "block",
          marginBottom: "5px",
          fontSize: "12px",
          color: "#aaa",
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
        onChange={(event) => {
          const value = Math.max(
            1,
            Math.min(
              20,
              Number(
                event.target.value
              ) || 1
            )
          );

          updateSelectedObject(
            "strokeWidth",
            value
          );
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: "42px",
          marginBottom: "12px",
          padding: "8px",
          background: "#222",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "6px",
        }}
      />

      {/* =========================
          ROTATION
      ========================= */}

      <label
        style={{
          display: "block",
          marginBottom: "5px",
          fontSize: "12px",
          color: "#aaa",
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
        onChange={(event) => {
          updateSelectedObject(
            "rotation",
            Number(
              event.target.value
            ) || 0
          );
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: "42px",
          marginBottom: "12px",
          padding: "8px",
          background: "#222",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "6px",
        }}
      />

      {/* =========================
          RADIUS
      ========================= */}

      {selectedObject.radius !==
        undefined && (
        <>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            Radius
          </label>

          <input
            type="number"
            min="1"
            value={
              selectedObject.radius
            }
            onChange={(event) => {
              const value = Math.max(
                1,
                Number(
                  event.target.value
                ) || 1
              );

              updateSelectedObject(
                "radius",
                value
              );
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: "42px",
              marginBottom: "12px",
              padding: "8px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "6px",
            }}
          />
        </>
      )}

      {/* =========================
          WIDTH
      ========================= */}

      {selectedObject.width !==
        undefined && (
        <>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            Width
          </label>

          <input
            type="number"
            value={
              selectedObject.width
            }
            onChange={(event) => {
              updateSelectedObject(
                "width",
                Number(
                  event.target.value
                ) || 0
              );
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: "42px",
              marginBottom: "12px",
              padding: "8px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "6px",
            }}
          />
        </>
      )}

      {/* =========================
          HEIGHT
      ========================= */}

      {selectedObject.height !==
        undefined && (
        <>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            Height
          </label>

          <input
            type="number"
            value={
              selectedObject.height
            }
            onChange={(event) => {
              updateSelectedObject(
                "height",
                Number(
                  event.target.value
                ) || 0
              );
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: "42px",
              marginBottom: "12px",
              padding: "8px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "6px",
            }}
          />
        </>
      )}

      {/* =========================
          FONT SIZE
      ========================= */}

      {selectedObject.fontSize !==
        undefined && (
        <>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            Font Size
          </label>

          <input
            type="number"
            min="6"
            max="200"
            value={
              selectedObject.fontSize
            }
            onChange={(event) => {
              const value = Math.max(
                6,
                Math.min(
                  200,
                  Number(
                    event.target.value
                  ) || 6
                )
              );

              updateSelectedObject(
                "fontSize",
                value
              );
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: "42px",
              marginBottom: "12px",
              padding: "8px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "6px",
            }}
          />
        </>
      )}

      {/* =========================
          DONE
      ========================= */}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowMobileProperties(false);
        }}
        style={{
          width: "100%",
          minHeight: "44px",
          marginTop: "4px",
          background: "#2d4058",
          color: "#fff",
          border: "1px solid #4b6b91",
          borderRadius: "7px",
          fontWeight: "600",
          cursor: "pointer",
        }}
      >
        Done
      </button>
    </div>
  )}

 {/* =========================
    ARC HANDLES
========================= */}

{selectedObject?.type === "arc" && (
  <>
    {/* CENTER GRIP */}
    <Circle
      x={selectedObject.x}
      y={selectedObject.y}
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable={tool === "move"}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={() =>
        startStretch(
          selectedIndex,
          "center"
        )
      }
      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "center",
          e
        )
      }
      onDragEnd={endStretch}
    />

    {/* START GRIP */}
    <Circle
      x={
        selectedObject.x +
        selectedObject.radius *
          Math.cos(
            selectedObject.angleStart
          )
      }
      y={
        selectedObject.y +
        selectedObject.radius *
          Math.sin(
            selectedObject.angleStart
          )
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable={tool === "move"}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={() =>
        startStretch(
          selectedIndex,
          "start"
        )
      }
      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "start",
          e
        )
      }
      onDragEnd={endStretch}
    />

    {/* END GRIP */}
    <Circle
      x={
        selectedObject.x +
        selectedObject.radius *
          Math.cos(
            selectedObject.angleEnd
          )
      }
      y={
        selectedObject.y +
        selectedObject.radius *
          Math.sin(
            selectedObject.angleEnd
          )
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2 / scale}
      draggable={tool === "move"}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={() =>
        startStretch(
          selectedIndex,
          "end"
        )
      }
      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "end",
          e
        )
      }
      onDragEnd={endStretch}
       />

  {/* MID GRIP */}
  <Circle
  x={
    selectedObject.x +
    selectedObject.radius *
      Math.cos(
        (
          selectedObject.angleStart +
          selectedObject.angleEnd
        ) / 2
      )
  }
  y={
    selectedObject.y +
    selectedObject.radius *
      Math.sin(
        (
          selectedObject.angleStart +
          selectedObject.angleEnd
        ) / 2
      )
  }
  radius={8}
  fill="yellow"
  stroke="black"
  strokeWidth={2 / scale}
  draggable={tool === "move"}
  onMouseDown={(e) => {
    e.cancelBubble = true;
  }}
  onTouchStart={(e) => {
    e.cancelBubble = true;
  }}
  onDragStart={() =>
    startStretch(
      selectedIndex,
      "mid"
    )
  }
  onDragMove={(e) =>
    updateStretch(
      selectedIndex,
      "mid",
      e
    )
  }
   onDragEnd={endStretch}
/>

  </>
)}

{/* TEXT HANDLES */}

{selectedObject?.type ===
  "text" && (
  <>
    <Circle
      x={
        selectedObject.x +
        (selectedObject.fontSize || 24) *
          5
      }
      y={
        selectedObject.y +
        (selectedObject.fontSize || 24) /
          2
      }
      radius={12 / scale}
      fill="#00aaff"
      stroke="white"
      strokeWidth={2 / scale}
      draggable={tool === "move"}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={() =>
        startStretch(
          selectedIndex,
          "text"
        )
      }
      onDragMove={(e) =>
        updateStretch(
          selectedIndex,
          "text",
          e
        )
      }
      onDragEnd={endStretch}
    />
  </>
)}

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
          OSNAP:{" "}
          {objectSnapEnabled ? "ON" : "OFF"}
        </span>

        <span>
           ORTHO:{" "}
           {orthoEnabled ? "ON" : "OFF"}
        </span>

        <span>
           POLAR:{" "}
           {polarEnabled ? "ON" : "OFF"}
        </span>

        <span>
           GRID:{" "}
           {gridEnabled ? "ON" : "OFF"}
        </span>

        <span>
  SNAP:{" "}
  {snapType || "OFF"}
</span>

     <span>
  TRACK:{" "}
  {objectSnapTrackingEnabled
    ? "ON"
    : "OFF"}
</span>

<span>
  DYN:{" "}
  {dynamicInputEnabled
    ? "ON"
    : "OFF"}
</span>
        
 <span>
  GRID SNAP:{" "}
  {gridSnapEnabled
    ? "ON"
    : "OFF"}
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
    </div>
  );
}


export default App;