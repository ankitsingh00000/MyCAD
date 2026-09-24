
import React, {
  useState,
  useRef,
  useEffect,
} from "react";
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

  const [commandText, setCommandText] =
  useState("");
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

  const [position, setPosition] = useState({
    x: 0,
    y: 0,
  });

  const [isPanning, setIsPanning] =
  useState(false);

  const [mousePosition, setMousePosition] =
    useState({
      x: 0,
      y: 0,
    });
    const [snapPoint, setSnapPoint] = useState(null);


const [objectSnapEnabled, setObjectSnapEnabled] =
  useState(true);

  const [orthoEnabled, setOrthoEnabled] =
  useState(false);

  const [polarEnabled, setPolarEnabled] =
  useState(false);

  const [gridEnabled, setGridEnabled] =
  useState(true);

  const [unit, setUnit] =
  useState("mm");

  const [clipboardObjects, setClipboardObjects] =
  useState([]);

  const [past, setPast] = useState([]);

  const [future, setFuture] = useState([]);

  const actionStartRef = useRef(null);

  const stageRef = useRef(null)
  
  const touchStateRef = useRef({
  lastDistance: null,
  lastCenter: null,
});

  const stretchStartRef = useRef(null);

  const panStartRef = useRef(null);

  const moveStartRef = useRef(null);

  const GRID_SIZE = 25;

const snapToGrid = (value) => {
  return (
    Math.round(value / GRID_SIZE) *
    GRID_SIZE
  );
};

const snapToObject = (x, y) => {
  if (!objectSnapEnabled) {
    return {
      x: snapToGrid(x),
      y: snapToGrid(y),
    };
  }

  const snapDistance = 15;
  const snapPoints = [];

  objects.forEach((object) => {

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
     FIND NEAREST SNAP POINT
  ========================= */

  let nearestPoint = null;

  let nearestDistance =
    snapDistance;

  snapPoints.forEach(
    (point) => {
      const distance =
        Math.hypot(
          point.x - x,
          point.y - y
        );

      if (
        distance <=
        nearestDistance
      ) {
        nearestDistance =
          distance;

        nearestPoint =
          point;
      }
    }
  );

  /* =========================
     SNAP FOUND
  ========================= */

  if (nearestPoint) {
    setSnapPoint(
      nearestPoint
    );

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
    Math.PI / 4;

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
  if (past.length === 0) {
    return;
  }

  const previousState =
    past[past.length - 1];

  setFuture((prev) => [
    ...prev,
    {
      objects: [...objects],
      measurements: [...measurements],
    },
  ]);

  setObjects(
    previousState.objects
  );

  setMeasurements(
    previousState.measurements
  );

  setPast((prev) =>
    prev.slice(0, -1)
  );

  setSelectedIndex(
    null
  );

  setSelectedIndexes(
    []
  );

  setSelectedMeasurementIndex(
  null
);


  setCommandFirstIndex(
    null
  );

  setMeasureStart(
    null
  );


setAnglePoints([]);

  setSnapPoint(
    null
  );

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

  setPast((prev) => [
    ...prev,
    {
      objects: [...objects],
      measurements: [...measurements],
    },
  ]);

  setObjects(
    nextState.objects
  );

  setMeasurements(
    nextState.measurements
  );

  setFuture((prev) =>
    prev.slice(0, -1)
  );

  setSelectedIndex(
    null
  );

  setSelectedIndexes(
    []
  );

  setSelectedMeasurementIndex(
  null
);

  setCommandFirstIndex(
    null
  );

 setMeasureStart(null);


  setAnglePoints([]);

  setSnapPoint(
    null
  );

  actionStartRef.current =
    null;

  moveStartRef.current =
    null;

  stretchStartRef.current =
    null;
};

  /* =========================
     MOUSE DOWN
  ========================= */

  const handleMouseDown = (e) => {
 
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

  /* BLANK CANVAS → START SELECTION BOX */
  const stage =
    e.target.getStage();

  if (!stage) return;

  const pointer =
    stage.getPointerPosition();

  if (!pointer) return;

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
      tool === "join"
    ) {
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

      let polyX = x;
      let polyY = y;

      const startX =
        current.points[
          current.points.length - 2
        ];

      const startY =
        current.points[
          current.points.length - 1
        ];

      /* POLAR */

      if (polarEnabled) {
        const polarPoint =
          applyPolar(
            startX,
            startY,
            x,
            y
          );

        polyX =
          polarPoint.x;

        polyY =
          polarPoint.y;
      }

      /* ORTHO */

      else if (orthoEnabled) {
        const orthoPoint =
          applyOrtho(
            startX,
            startY,
            x,
            y
          );

        polyX =
          orthoPoint.x;

        polyY =
          orthoPoint.y;
      }

      current.points = [
        ...current.points,
        polyX,
        polyY,
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
              Math.hypot(dx, dy)
            ),
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

    if (
  isPanning &&
  panStartRef.current
) {
  const dx =
    e.evt.clientX -
    panStartRef.current.mouseX;

  const dy =
    e.evt.clientY -
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

    /* SELECTION BOX */
if (isSelecting && selectionBox) {
  setSelectionBox((prev) => {
    if (!prev) return null;

    return {
      ...prev,
      width: rawX - prev.x,
      height: rawY - prev.y,
    };
  });

  return;
}

const snappedPoint =
  snapToObject(
    rawX,
    rawY
  );

if (!isDrawing) {
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
  objects[objects.length - 1];

if (
  lastObject &&
  lastObject.type === "line"
) {
  if (polarEnabled) {
    const polarPoint =
      applyPolar(
        lastObject.points[0],
        lastObject.points[1],
        x,
        y
      );

    x = polarPoint.x;
    y = polarPoint.y;
  } else if (orthoEnabled) {
    const orthoPoint =
      applyOrtho(
        lastObject.points[0],
        lastObject.points[1],
        x,
        y
      );

    x = orthoPoint.x;
    y = orthoPoint.y;
  }
}

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
            x - startX
          );

        current.height =
          Math.abs(
            y - startY
          );
      }

      updated[lastIndex] = current;

      return updated;
    });
  };

  /* =========================
   LINE GRIP DRAG
========================= */

const handleLineGripDragEnd = (index, gripIndex, e) => {

  const node = e.target;

  const newX = node.x();
  const newY = node.y();

  const previousObjects = [...objects];

  const updatedObjects = objects.map(
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

  setObjects(updatedObjects);

  saveHistory(
    previousObjects,
    updatedObjects
  );

  e.cancelBubble = true;
};

/* =========================
   RECTANGLE GRIP DRAG
========================= */

const handleRectangleGripDragEnd = (
  index,
  gripType,
  e
) => {
  const node = e.target;

  const mouseX = node.x();
  const mouseY = node.y();

  const previousObjects = [...objects];

  const updatedObjects = objects.map(
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

      if (gripType === "top-left") {
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

      if (gripType === "top") {
        y = mouseY;
        height =
          object.y +
          object.height -
          mouseY;
      }

      if (gripType === "top-right") {
        width =
          mouseX - object.x;

        height =
          object.y +
          object.height -
          mouseY;

        y = mouseY;
      }

      if (gripType === "right") {
        width =
          mouseX - object.x;
      }

      if (gripType === "bottom-right") {
        width =
          mouseX - object.x;

        height =
          mouseY - object.y;
      }

      if (gripType === "bottom") {
        height =
          mouseY - object.y;
      }

      if (gripType === "bottom-left") {
        width =
          object.x +
          object.width -
          mouseX;

        height =
          mouseY - object.y;

        x = mouseX;
      }

      if (gripType === "left") {
        width =
          object.x +
          object.width -
          mouseX;

        x = mouseX;
      }

      /* Prevent negative dimensions */

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

  setObjects(updatedObjects);

  saveHistory(
    previousObjects,
    updatedObjects
  );

  e.cancelBubble = true;
};

const handlePolylineGripDragEnd = (index, pointIndex, e) => {
  const node = e.target;

  const newX = node.x();
  const newY = node.y();

  const previousObjects = [...objects];

  const updatedObjects = objects.map(
    (object, objectIndex) => {
      if (
        objectIndex !== index ||
        object.type !== "polyline"
      ) {
        return object;
      }

      const newPoints = [...object.points];

      newPoints[pointIndex] = newX;
      newPoints[pointIndex + 1] = newY;

      return {
        ...object,
        points: newPoints,
      };
    }
  );

  setObjects(updatedObjects);
  saveHistory(
    previousObjects,
    updatedObjects
  );

  e.cancelBubble = true;
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
    const radius = object.radius || 0;

    return {
      left: object.x - radius,
      right: object.x + radius,
      top: object.y - radius,
      bottom: object.y + radius,
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

  /* ARC */
  if (object.type === "arc") {
   const radius = Math.max(
  20,
  object.radius || 0
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
    const fontSize = object.fontSize || 24;
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
  if (
  tool === "move" &&
  moveStartRef.current
) {
  finishMove();
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
  tool === "polyline" ||
  tool === "arc"
) {
  return;
}

  if (!isDrawing) return;

/* LINE LENGTH INPUT */

if (tool === "line") {
  const input = window.prompt(
    `Line length enter karo (${unit})`,
    "100"
  );

  if (
    input !== null &&
    input.trim() !== ""
  ) {
    const value = parseFloat(
      input.trim()
    );

    if (
      Number.isFinite(value) &&
      value > 0
    ) {
      let lengthMm = value;

      if (unit === "inch") {
        lengthMm = value * 25.4;
      }

      if (unit === "ft-in") {
  const match =
    input.trim().match(
      /^(\d+(?:\.\d+)?)\s*(?:ft|feet|')?\s*(?:[\s,]+)?(\d+(?:\.\d+)?)?\s*(?:in|inch|inches|")?$/
    );

  if (!match) {
    return;
  }

  const feet =
    Number(match[1]) || 0;

  const inches =
    Number(match[2]) || 0;

  lengthMm =
    feet * 304.8 +
    inches * 25.4;
}

      setObjects((prev) => {
        if (prev.length === 0) {
          return prev;
        }

        const lastIndex =
          prev.length - 1;

        const line =
          prev[lastIndex];

        if (
          line?.type !== "line" ||
          line.points?.length < 4
        ) {
          return prev;
        }

        const x1 =
          line.points[0];

        const y1 =
          line.points[1];

        const x2 =
          line.points[2];

        const y2 =
          line.points[3];

        const dx = x2 - x1;
        const dy = y2 - y1;

        const currentLength =
          Math.hypot(dx, dy);

        if (currentLength === 0) {
          return prev;
        }

        const newX2 =
          x1 +
          (dx / currentLength) *
            lengthMm;

        const newY2 =
          y1 +
          (dy / currentLength) *
            lengthMm;

        const updated = [...prev];

        updated[lastIndex] = {
          ...line,
          points: [
            x1,
            y1,
            newX2,
            newY2,
          ],
        };

        return updated;
      });
    }
  }
}

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
     F8 = ORTHO
  ========================= */

  if (e.key === "F8") {
    e.preventDefault();

    setOrthoEnabled(
      (prev) => !prev
    );

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
     CTRL + A
  ========================= */

  if (
    e.ctrlKey &&
    key === "a"
  ) {
    e.preventDefault();

    const allIndexes =
      objects.map(
        (_, index) => index
      );

    setSelectedIndexes(
      allIndexes
    );

    setSelectedIndex(
      allIndexes.length > 0
        ? allIndexes[
            allIndexes.length - 1
          ]
        : null
    );

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
     CTRL + Z = UNDO
  ========================= */

  if (
    e.ctrlKey &&
    key === "z" &&
    !e.shiftKey
  ) {
    e.preventDefault();

    undo();

    return;
  }

  /* =========================
     CTRL + Y
     CTRL + SHIFT + Z
     = REDO
  ========================= */

  if (
    e.ctrlKey &&
    (
      key === "y" ||
      (
        key === "z" &&
        e.shiftKey
      )
    )
  ) {
    e.preventDefault();

    redo();

    return;
  }

  /* =========================
     + = ZOOM IN
  ========================= */

  if (
    e.key === "+" ||
    e.key === "=" ||
    e.code === "NumpadAdd"
  ) {
    e.preventDefault();

    setScale(
      (prev) =>
        Math.min(
          prev * 1.2,
          5
        )
    );

    return;
  }

  /* =========================
     - = ZOOM OUT
  ========================= */

  if (
    e.key === "-" ||
    e.key === "_" ||
    e.code === "NumpadSubtract"
  ) {
    e.preventDefault();

    setScale(
      (prev) =>
        Math.max(
          prev / 1.2,
          0.2
        )
    );

    return;
  }

  /* =========================
     DELETE
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

    /* CANCEL SELECTION BOX */
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionBox(null);
      return;
    }

    if (isDrawing) {

      setIsDrawing(
        false
      );

      setObjects(
        (prev) => {

          if (
            prev.length === 0
          ) {
            return prev;
          }

          const lastObject =
            prev[
              prev.length - 1
            ];

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
            return prev.slice(
              0,
              -1
            );
          }

          return prev;
        }
      );

      actionStartRef.current =
        null;

        setArcPoints([]);

      stretchStartRef.current =
        null;

      setSnapPoint(
        null
      );

      return;
    }

    setSelectedIndex(
      null
    );

    setSelectedIndexes(
      []
    );

    setSelectedMeasurementIndex(
  null
);

   setCommandFirstIndex(
  null
);

setMeasureStart(
  null
);

setAnglePoints([]);

setIsDrawing(
  false
);

setSnapPoint(
  null
);

    return;
  }

  /* =========================
     CTRL + S = SAVE
  ========================= */

  if (
    e.ctrlKey &&
    key === "s"
  ) {
    e.preventDefault();

    saveDrawing();

    return;
  }

  /* =========================
     CTRL + O = OPEN
  ========================= */

  if (
    e.ctrlKey &&
    key === "o"
  ) {
    e.preventDefault();

    openDrawing();

    return;
  }

  /* =========================
     HOME = ZOOM FIT
  ========================= */

  if (
    e.key === "Home"
  ) {
    e.preventDefault();

    zoomFit();

    return;
  }

  /* =========================
     TOOL SHORTCUTS
  ========================= */

  if (key === "l") {
    changeTool("line");
    return;
  }

  if (key === "p") {
    changeTool("polyline");
    return;
  }

  if (key === "t") {
    changeTool("text");
    return;
  }

  if (key === "r") {
    changeTool("rectangle");
    return;
  }

  if (key === "c") {
    changeTool("circle");
    return;
  }

  if (key === "k") {
  changeTool("arc");
  return;
}

  if (key === "m") {
    changeTool("move");
    return;
  }

  if (key === "o") {
    changeTool("offset");
    return;
  }

  if (key === "f") {
    changeTool("fillet");
    return;
  }

  if (key === "h") {
    changeTool("chamfer");
    return;
  }

  if (key === "s") {
    changeTool("stretch");
    return;
  }

  if (key === "a") {
    changeTool("array");
    return;
  }

  if (key === "v") {
    changeTool("mirror");
    return;
  }

  if (key === "e") {
    changeTool("explode");
    return;
  }

  if (key === "j") {
    changeTool("join");
    return;
  }

  if (key === "q") {
    changeTool("select");
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
    copyObject(index);
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

  trimObject(
    boundaryIndex,
    targetIndex
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

  /* STRETCH */

  if (tool === "stretch") {
    setSelectedIndex(index);
    return;
  }

  /* OFFSET */

  if (tool === "offset") {
    offsetObject(index);
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

  /* JOIN */

 if (tool === "join") {
  const currentSelection = [
    ...selectedIndexes,
  ];

  if (
    currentSelection.length === 0
  ) {
    setSelectedIndexes([index]);
    setSelectedIndex(index);
    return;
  }

  if (
    currentSelection.length === 1
  ) {
    if (
      currentSelection[0] === index
    ) {
      return;
    }

    const firstIndex =
      currentSelection[0];

    joinObject(
      firstIndex,
      index
    );

    setSelectedIndexes([]);
    setSelectedIndex(null);

    return;
  }

  window.alert(
    "Join requires exactly two selected objects."
  );

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
 /* =========================
   COPY
========================= */

const copyObject = (index) => {
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

  indexesToCopy.forEach(
    (objectIndex) => {
      const original =
        objects[objectIndex];

      if (!original) return;

      const copied = {
        ...original,
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

      /* ARC */

      else if (
        original.type === "arc"
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

  saveHistory(
    previousObjects,
    [...measurements]
  );
};
  /* =========================
     ROTATE
  ========================= */
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
    new Set(indexesToRotate);

  const updatedObjects =
    objects.map(
      (object, objectIndex) => {
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
          object.type === "polyline" &&
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

          const rotatedPoints = [];

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
          object.type === "rectangle"
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
          object.type === "circle"
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
    indexesToRotate
  );

  setSelectedIndex(
    indexesToRotate[
      indexesToRotate.length - 1
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

  if (Math.abs(denominator) < 0.000001) {
    return null;
  }

  const t =
    ((x1 - x3) * (y3 - y4) -
      (y1 - y3) * (x3 - x4)) /
    denominator;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
    t,
  };
};

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

  const x1 = line.points[0];
  const y1 = line.points[1];

  const x2 = line.points[2];
  const y2 = line.points[3];

  const dx = x2 - x1;
  const dy = y2 - y1;

  const fx = x1 - arc.x;
  const fy = y1 - arc.y;

  const a =
    dx * dx +
    dy * dy;

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
    arc.radius *
      arc.radius;

  const discriminant =
    b * b -
    4 * a * c;

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
    arc.angleEnd -
    arc.angleStart;

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
          py - arc.y,
          px - arc.x
        );

      let arcT =
        angle -
        arc.angleStart;

      arcT =
        (
          (
            arcT %
            fullCircle
          ) +
          fullCircle
        ) %
        fullCircle;

      if (
        arcT >
        sweep +
          0.000001
      ) {
        return;
      }

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
          arc.angleStart +
          arcT,
        arcT,
        lineT: t,
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
  targetIndex
) => {
  const boundary =
    objects[boundaryIndex];

  const target =
    objects[targetIndex];

  if (!boundary || !target) {
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

  const dx =
    target.x -
    boundary.x;

  const dy =
    target.y -
    boundary.y;

  const centerDistance =
    Math.hypot(
      dx,
      dy
    );

  const r1 =
    boundary.radius;

  const r2 =
    target.radius;

  if (
    centerDistance <
    0.000001
  ) {
    window.alert(
      "These arcs have the same center."
    );
    return;
  }

  if (
    centerDistance >
      r1 + r2 ||
    centerDistance <
      Math.abs(r1 - r2)
  ) {
    window.alert(
      "The two arcs do not intersect."
    );
    return;
  }

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
    boundary.x +
    (
      a * dx
    ) /
    centerDistance;

  const baseY =
    boundary.y +
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

  const intersections =
    candidates.filter(
      (point) => {
        const boundaryAngle =
          Math.atan2(
            point.y -
              boundary.y,
            point.x -
              boundary.x
          );

        return isAngleOnArc(
          boundary,
          boundaryAngle
        );
      }
    ).map(
      (point) => ({
        ...point,

        targetAngle:
          Math.atan2(
            point.y -
              target.y,
            point.x -
              target.x
          ),
      })
    );

  if (
    intersections.length === 0
  ) {
    window.alert(
      "The visible boundary arc does not intersect the target arc."
    );
    return;
  }

  const targetSweep =
    target.angleEnd -
    target.angleStart;

  let bestIntersection =
    null;

  let bestDistance =
    Infinity;

  intersections.forEach(
    (intersection) => {
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

  const previousObjects = [
    ...objects,
  ];

  let updatedTarget;

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
        (
          objects[i].type === "line" ||
          objects[i].type === "rectangle" ||
          objects[i].type === "circle" ||
          objects[i].type === "arc"
        )
    );

  if (validIndexes.length === 0) {
    window.alert(
  "Offset is currently available for Line, Rectangle, Circle and Arc."
);
    return;
  }

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

  const offsetObjects = [];

  validIndexes.forEach((objectIndex) => {
    const original =
      objects[objectIndex];

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

      if (length === 0) {
        return;
      }

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
      newObject = {
        ...original,
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

    /* ARC OFFSET */

else if (
  original.type === "arc"
) {
  newObject = {
    ...original,
    radius:
      original.radius +
      distance,
  };
}

    if (newObject) {
      offsetObjects.push(
        newObject
      );
    }
  });

  if (offsetObjects.length === 0) {
    return;
  }

  const newObjects = [
    ...objects,
    ...offsetObjects,
  ];

  setObjects(
    newObjects
  );

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
    newIndexes[
      newIndexes.length - 1
    ]
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
        i < objects.length
    );

  if (
    validIndexes.length === 0
  ) {
    return;
  }

  const rowsInput =
    window.prompt(
      "Number of rows:",
      "2"
    );

  if (rowsInput === null)
    return;

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
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    rows < 1 ||
    columns < 1
  ) {
    window.alert(
      "Rows and columns must be positive numbers."
    );
    return;
  }

  if (
    !Number.isFinite(xSpacing) ||
    !Number.isFinite(ySpacing)
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

  validIndexes.forEach(
    (sourceIndex) => {
      const original =
        objects[sourceIndex];

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

          const offsetX =
            column *
            xSpacing;

          const offsetY =
            row *
            ySpacing;

          /* LINE */

          if (
            original.type === "line"
          ) {
            copy.points = [
              original.points[0] +
                offsetX,

              original.points[1] +
                offsetY,

              original.points[2] +
                offsetX,

              original.points[3] +
                offsetY,
            ];
          }

          /* POLYLINE */

          else if (
            original.type === "polyline"
          ) {
            copy.points =
              original.points.map(
                (value, i) => {
                  if (
                    i % 2 === 0
                  ) {
                    return (
                      value +
                      offsetX
                    );
                  }

                  return (
                    value +
                    offsetY
                  );
                }
              );
          }

          /* CIRCLE */

          else if (
            original.type === "circle"
          ) {
            copy.x =
              original.x +
              offsetX;

            copy.y =
              original.y +
              offsetY;
          }

          /* RECTANGLE */

          else if (
            original.type ===
            "rectangle"
          ) {
            copy.x =
              original.x +
              offsetX;

            copy.y =
              original.y +
              offsetY;
          }

          /* ARC */

          else if (
            original.type === "arc"
          ) {
            copy.x =
              original.x +
              offsetX;

            copy.y =
              original.y +
              offsetY;
          }

          /* TEXT */

          else if (
            original.type === "text"
          ) {
            copy.x =
              original.x +
              offsetX;

            copy.y =
              original.y +
              offsetY;
          }

          else {
            continue;
          }

          copies.push(copy);
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

  saveHistory(
    previousObjects,
    [...measurements]
  );
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
        objects[i]
    );

  if (
    validIndexes.length === 0
  ) {
    return;
  }

  const factorInput =
    window.prompt(
      "Enter scale factor:",
      "2"
    );

  if (factorInput === null)
    return;

  const factor =
    Number(factorInput);

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

  const copies = [];

  validIndexes.forEach(
    (objectIndex) => {
      const original =
        objects[objectIndex];

      const copy = {
        ...original,
      };

      /* LINE */

      if (
        original.type === "line"
      ) {
        copy.points =
          original.points.map(
            (value) =>
              value * factor
          );
      }

      /* POLYLINE */

      else if (
        original.type === "polyline"
      ) {
        copy.points =
          original.points.map(
            (value) =>
              value * factor
          );
      }

      /* CIRCLE */

      else if (
        original.type === "circle"
      ) {
        copy.x =
          original.x * factor;

        copy.y =
          original.y * factor;

        copy.radius =
          original.radius *
          factor;
      }

      /* RECTANGLE */

      else if (
        original.type === "rectangle"
      ) {
        copy.x =
          original.x * factor;

        copy.y =
          original.y * factor;

        copy.width =
          original.width *
          factor;

        copy.height =
          original.height *
          factor;
      }

      /* ARC */

      else if (
        original.type === "arc"
      ) {
        copy.x =
          original.x * factor;

        copy.y =
          original.y * factor;

        copy.radius =
          original.radius *
          factor;
      }

      /* TEXT */

      else if (
        original.type === "text"
      ) {
        copy.x =
          original.x * factor;

        copy.y =
          original.y * factor;

        copy.fontSize =
          (original.fontSize || 24) *
          factor;
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
    newIndexes[
      newIndexes.length - 1
    ]
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
  const indexesToMirror =
    selectedIndexes.length > 1
      ? selectedIndexes
      : index !== null
      ? [index]
      : [];

  const validIndexes =
    indexesToMirror.filter(
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

  const axisInput =
    window.prompt(
      "Mirror axis: H = Horizontal, V = Vertical",
      "V"
    );

  if (axisInput === null)
    return;

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

  validIndexes.forEach(
    (objectIndex) => {
      const original =
        objects[objectIndex];

      const copy = {
        ...original,
      };

      /* LINE */

      if (
        original.type === "line"
      ) {
        copy.points =
          original.points.map(
            (value, i) => {
              if (i % 2 === 0) {
                return axis === "V"
                  ? -value
                  : value;
              }

              return axis === "H"
                ? -value
                : value;
            }
          );
      }

      /* POLYLINE */

      else if (
        original.type ===
        "polyline"
      ) {
        copy.points =
          original.points.map(
            (value, i) => {
              if (i % 2 === 0) {
                return axis === "V"
                  ? -value
                  : value;
              }

              return axis === "H"
                ? -value
                : value;
            }
          );
      }

      /* CIRCLE */

      else if (
        original.type ===
        "circle"
      ) {
        copy.x =
          axis === "V"
            ? -original.x
            : original.x;

        copy.y =
          axis === "H"
            ? -original.y
            : original.y;
      }

      /* RECTANGLE */

      else if (
        original.type ===
        "rectangle"
      ) {
        copy.x =
          axis === "V"
            ? -original.x
            : original.x;

        copy.y =
          axis === "H"
            ? -original.y
            : original.y;
      }

    /* ARC */

else if (
  original.type === "arc"
) {
  copy.x =
    axis === "V"
      ? -original.x
      : original.x;

  copy.y =
    axis === "H"
      ? -original.y
      : original.y;

  if (axis === "V") {
    copy.angleStart =
      Math.PI -
      original.angleEnd;

    copy.angleEnd =
      Math.PI -
      original.angleStart;
  }

  if (axis === "H") {
    copy.angleStart =
      -original.angleEnd;

    copy.angleEnd =
      -original.angleStart;
  }

  copy.rotation = 0;
}

      /* TEXT */

      else if (
        original.type ===
        "text"
      ) {
        copy.x =
          axis === "V"
            ? -original.x
            : original.x;

        copy.y =
          axis === "H"
            ? -original.y
            : original.y;

        if (axis === "H") {
          copy.rotation =
            -(
              original.rotation ||
              0
            );
        } else {
          copy.rotation =
            180 -
            (
              original.rotation ||
              0
            );
        }
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
    newIndexes[
      newIndexes.length - 1
    ]
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

  const previousObjects = [
    ...objects,
  ];

  const explodeSet =
    new Set(validIndexes);

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
        const x = original.x;
        const y = original.y;

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
    Number(original.radius);

  const angleStart =
    Number(original.angleStart);

  const angleEnd =
    Number(original.angleEnd);

  if (
    !Number.isFinite(radius) ||
    radius <= 0 ||
    !Number.isFinite(angleStart) ||
    !Number.isFinite(angleEnd)
  ) {
    newObjects.push(
      original
    );

    return;
  }

  let sweep =
    angleEnd -
    angleStart;

  /*
    Arc ka actual sweep
    preserve karenge.
  */

  if (
    Math.abs(sweep) <
    0.000001
  ) {
    newObjects.push(
      original
    );

    return;
  }

  const steps = Math.max(
    8,
    Math.min(
      64,
      Math.ceil(
        Math.abs(sweep) /
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
      (i + 1) / steps;

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
  if (tool !== "move") {
    return;
  }

  const object =
    objects[index];

  if (!object) {
    return;
  }

  const indexesToMove =
    selectedIndexes.length > 0 &&
    selectedIndexes.includes(index)
      ? [...selectedIndexes]
      : [index];

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

  const startX =
    (pointer.x - position.x) /
    scale;

  const startY =
    (pointer.y - position.y) /
    scale;

  moveStartRef.current = {
    index,
    indexes: indexesToMove,

    startPointer: {
      x: startX,
      y: startY,
    },

    objects:
      JSON.parse(
        JSON.stringify(objects)
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

  const moveSet =
    new Set(
      startData.indexes
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

        /* LINE */

        if (
          original.type === "line" &&
          original.points?.length >= 4
        ) {
          return {
            ...original,

            points: [
              original.points[0] + dx,
              original.points[1] + dy,
              original.points[2] + dx,
              original.points[3] + dy,
            ],
          };
        }

        /* POLYLINE */

        if (
          original.type === "polyline" &&
          original.points?.length >= 2
        ) {
          return {
            ...original,

            points:
              original.points.map(
                (
                  value,
                  pointIndex
                ) =>
                  pointIndex % 2 === 0
                    ? value + dx
                    : value + dy
              ),
          };
        }

        /* OTHER OBJECTS */

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

const finishMove = () => {
  const startData =
    moveStartRef.current;

  if (!startData) {
    return;
  }

  if (startData.moved) {
    saveHistory(
      startData.objects,
      startData.measurements
    );
  }

  moveStartRef.current =
    null;
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

    if (!first || !second) {
      window.alert(
        "Object not found."
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

    if (best.distance > 25) {
  window.alert(
    "Objects are not connected."
  );
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
    setSelectedIndexes([index]);
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

/* ARC */

if (object.type === "arc") {

  /* CENTER */

  if (handle === "center") {
    object.x = x;
    object.y = y;
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

/* TEXT */

if (
 object.type ===
  "text"
    ) {
        const startFontSize =
          startObject.fontSize ||
          24;

        const newFontSize =
          startFontSize +
          (x - startObject.x);

        object.fontSize =
          Math.max(
            8,
            newFontSize
          );
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
  const indexesToMove =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
      ? [selectedIndex]
      : [];

  if (
    indexesToMove.length === 0
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const moveSet =
    new Set(indexesToMove);

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
};
 /* =========================
   UPDATE PROPERTIES
========================= */

const updateSelectedObject = (
  property,
  value
) => {
  const indexesToUpdate =
    selectedIndexes.length > 0
      ? selectedIndexes
      : selectedIndex !== null
      ? [selectedIndex]
      : [];

  if (
    indexesToUpdate.length === 0
  ) {
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
    property === "fontSize"
  ) {
    finalValue = Number(value);
  }

  const updateSet =
    new Set(indexesToUpdate);

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
    selectedMeasurementIndex ===
      null
  ) {
    return;
  }

  const previousObjects = [
    ...objects,
  ];

  const previousMeasurements = [
    ...measurements,
  ];

  /* DELETE MEASUREMENT */

  if (
    selectedMeasurementIndex !==
    null
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

    return;
  }

  /* DELETE OBJECTS */

  const deleteSet =
    new Set(
      indexesToDelete
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

setAnglePoints([]);

setSelectedIndex(null);

  setSelectedIndexes([]);

  setCommandFirstIndex(null);

  setIsDrawing(false);

  setSnapPoint(null);

  actionStartRef.current =
    null;

  stretchStartRef.current =
    null;

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
  if (
    isPanning ||
    e.evt?.buttons === 4
  ) {
    return;
  }

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
     ZOOM FIT
  ========================= */

  const zoomFit = () => {
    if (objects.length === 0) {
      setScale(1);

      setPosition({
        x: 0,
        y: 0,
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

      if (
        object.type === "rectangle"
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
  window.innerWidth <= 768
    ? window.innerWidth
    : window.innerWidth - 298;

   const canvasHeight =
  window.innerWidth <= 768
    ? window.innerHeight - 56 - 64
    : window.innerHeight - 87;

    const padding = 80;

    const scaleX =
      (canvasWidth - padding) /
      drawingWidth;

    const scaleY =
      (canvasHeight - padding) /
      drawingHeight;

    const newScale =
      Math.max(
        0.2,
        Math.min(
          5,
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
    return {
      x:
        (touches[0].clientX +
          touches[1].clientX) /
        2,

      y:
        (touches[0].clientY +
          touches[1].clientY) /
        2,
    };
  };

  const handleTouchStart = (e) => {
    const touches =
      e.evt.touches;

    if (!touches) return;

    e.evt.preventDefault();

    if (touches.length === 2) {
      touchStateRef.current = {
       lastDistance:
  getTouchDistance(touches),

lastCenter:
  getTouchCenter(touches),
      };

      return;
    }

    if (touches.length === 1) {
      handleMouseDown(e);
    }
  };

  const handleTouchMove = (e) => {
    const touches =
      e.evt.touches;

    if (!touches) return;

    e.evt.preventDefault();

    if (touches.length === 2) {
      const center =
        getTouchCenter(touches);

      const distance =
        getTouchDistance(touches);

      const oldScale =
        scale;

      const oldCenter =
        touchStateRef.current.lastCenter;

      if (!oldCenter) {
        touchStateRef.current.lastCenter =
          center;

        touchStateRef.current.lastDistance =
          distance;

        return;
      }

      const zoomRatio =
        distance /
        (touchStateRef.current.lastDistance ||
          distance);

      const newScale = Math.max(
        0.2,
        Math.min(
          oldScale * zoomRatio,
          20
        )
      );

      const worldPoint = {
        x:
          (oldCenter.x -
            position.x) /
          oldScale,

        y:
          (oldCenter.y -
            position.y) /
          oldScale,
      };

      setScale(newScale);

      setPosition({
        x:
          center.x -
          worldPoint.x *
            newScale,

        y:
          center.y -
          worldPoint.y *
            newScale,
      });

      touchStateRef.current = {
        lastDistance:
          distance,

        lastCenter:
          center,
      };

      return;
    }

    if (touches.length === 1) {
      handleMouseMove(e);
    }
  };

  const handleTouchEnd = (e) => {
    e.evt.preventDefault();

    const touches =
      e.evt.touches;

    if (
      touches &&
      touches.length === 1
    ) {
      touchStateRef.current = {
        lastDistance: null,
        lastCenter: null,
      };

      return;
    }

    touchStateRef.current = {
      lastDistance: null,
      lastCenter: null,
    };

    handleMouseUp();
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
     SAVE / OPEN DRAWING
  ========================= */

  const saveDrawing = () => {
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

    const blob = new Blob(
      [json],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "mycad-drawing.json";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
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
        object.type === "arc" ||
        object.type === "text"
      ) {
        points.push({
          x: object.x || 0,
          y: object.y || 0,
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
  setTool(newTool);

  const drawingTools = [
  "line",
  "polyline",
  "text",
  "rectangle",
  "circle",
  "arc",
  "measure",
  "dimension",
  "radiusDimension",
  "diameterDimension",
  "angularDimension",
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

        <button
          onClick={openDrawing}
        >
          Open
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
                Math.min(prev * 1.2, 5)
              )
            }
            title="Zoom In"
          >
            +
          </button>

          <button
            onClick={() =>
              setScale((prev) =>
                Math.max(prev / 1.2, 0.2)
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

        <main className="workspace">

          <Stage
            ref={stageRef}
            width={
  window.innerWidth <= 768
    ? window.innerWidth
    : window.innerWidth - 298
}
         height={
  window.innerWidth <= 768
    ? window.innerHeight - 87 - 64
    : window.innerHeight - 87
}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
           draggable={
  tool === "select" &&
  !isSelecting
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
            onMouseLeave={() =>
              setSnapPoint(null)
            }
            onMouseUp={
              handleMouseUp
            }
            onWheel={
              handleWheel
            }

            onTouchStart={handleTouchStart}
onTouchMove={handleTouchMove}
onTouchEnd={handleTouchEnd}
          >

            <Layer>
            {snapPoint && (
  <Circle
    x={snapPoint.x}
    y={snapPoint.y}
    radius={7}
    stroke="yellow"
    strokeWidth={2}
    listening={false}
  />
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
    strokeWidth={1}
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
                    radius={6}
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
            radius={5}
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
          strokeWidth={2}
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
            strokeWidth={2}
          />

          <Line
            points={[
              anglePoints[0].x,
              anglePoints[0].y,
              snapPoint?.x ?? mousePosition.x,
              snapPoint?.y ?? mousePosition.y,
            ]}
            stroke="yellow"
            strokeWidth={2}
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
  strokeWidth={2}
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
          fontSize={16}
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
            ? 4
            : 2
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
            ? 4
            : 2
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
            ? 4
            : 2
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
        strokeWidth={2}
      />

      <Line
        points={[
          arcStartX,
          arcStartY,
          startArrow2.x,
          startArrow2.y,
        ]}
        stroke="yellow"
        strokeWidth={2}
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
        strokeWidth={2}
      />

      <Line
        points={[
          arcEndX,
          arcEndY,
          endArrow2.x,
          endArrow2.y,
        ]}
        stroke="yellow"
        strokeWidth={2}
      />

      {/* VERTEX */}

      <Circle
        x={vertexX}
        y={vertexY}
        radius={
          angularSelected
            ? 6
            : 4
        }
        fill="yellow"
      />

      {/* POINT 1 */}

      <Circle
        x={measurement.x2}
        y={measurement.y2}
        radius={
          angularSelected
            ? 6
            : 4
        }
        fill="yellow"
      />

      {/* POINT 2 */}

      <Circle
        x={measurement.x3}
        y={measurement.y3}
        radius={
          angularSelected
            ? 6
            : 4
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
        fontSize={16}
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
            ? 4
            : 2
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
            ? 3
            : 2
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
            ? 3
            : 2
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
            ? 6
            : 4
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
            ? 6
            : 4
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
        fontSize={16}
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
            ? 4
            : 2
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
        strokeWidth={2}
      />

      <Line
        points={[
          point1X,
          point1Y,
          arrow2.x,
          arrow2.y,
        ]}
        stroke="yellow"
        strokeWidth={2}
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
        strokeWidth={2}
      />

      <Line
        points={[
          point2X,
          point2Y,
          arrow4.x,
          arrow4.y,
        ]}
        stroke="yellow"
        strokeWidth={2}
      />

      {/* CENTER */}

      <Circle
        x={centerX}
        y={centerY}
        radius={
          diameterSelected
            ? 6
            : 4
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
        fontSize={16}
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
              ? 4
              : 2
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
              strokeWidth={1}
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
              strokeWidth={1}
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
          radius={4}
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
          radius={4}
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
          fontSize={16}
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
                  const selected =
                    selectedIndex === index ||
                    selectedIndexes.includes(index);

                  const commonProps = {
  
  id: `object-${index}`,

  draggable: false,

onMouseDown: (event) => {
if (tool === "arc") {
    return;
  }

  event.cancelBubble = true;

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
            strokeWidth={2}
            draggable
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
            strokeWidth={2}
            draggable
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

/* CIRCLE */

if (
  object.type ===
  "circle"
) {
  return (
    <React.Fragment key={index}>

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
          selectedIndex === index
            ? "yellow"
            : object.color ||
              "#ffffff"
        }
        strokeWidth={
          selectedIndex === index
            ? 4
            : object.strokeWidth ||
              2
        }
        rotation={
          object.rotation ||
          0
        }
      />

      {/* CIRCLE GRIPS */}

      {selectedIndex === index && (
        <>
          {/* CENTER GRIP */}
          <Circle
            x={object.x}
            y={object.y}
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
              object.radius
            }
            y={object.y}
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
  ? 4
  : object.strokeWidth ||
    2
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
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
            radius={6}
            fill="#00aaff"
            stroke="white"
            strokeWidth={2}
            draggable
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
          selectedIndex === index
            ? "yellow"
            : object.color ||
              "#ffffff"
        }
        strokeWidth={
          selectedIndex === index
            ? 4
            : object.strokeWidth ||
              2
        }
        hitStrokeWidth={15}
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
                radius={6}
                fill="#00aaff"
                stroke="white"
                strokeWidth={2}
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
   ARC
========================= */

if (object.type === "arc") {
  const start = object.angleStart || 0;
  const end = object.angleEnd || 0;
const radius = Math.max(
  20,
  object.radius || 0
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
          ? 4
          : object.strokeWidth || 2
      }
      lineCap="round"
      lineJoin="round"
      hitStrokeWidth={15}
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
      onDblClick={() => {
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

        saveHistory(
          previousObjects,
          [...measurements]
        );
      }}
      onDblTap={() => {
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

              {tool === "stretch" &&
                selectedObject && (
                  <>

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

                    {selectedObject?.type ===
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

                    {selectedObject?.type ===
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

{/* ARC HANDLES */}

{selectedObject.type ===
  "arc" && (
  <>
  {/* CENTER HANDLE */}

<Circle
  x={selectedObject.x}
  y={selectedObject.y}
  radius={8}
  fill="yellow"
  stroke="black"
  strokeWidth={2}
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
    {/* START HANDLE */}

    <Circle
      x={
        selectedObject.x +
        Math.cos(
          selectedObject.angleStart
        ) *
          selectedObject.radius
      }
      y={
        selectedObject.y +
        Math.sin(
          selectedObject.angleStart
        ) *
          selectedObject.radius
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2}
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

    {/* END HANDLE */}

    <Circle
      x={
        selectedObject.x +
        Math.cos(
          selectedObject.angleEnd
        ) *
          selectedObject.radius
      }
      y={
        selectedObject.y +
        Math.sin(
          selectedObject.angleEnd
        ) *
          selectedObject.radius
      }
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2}
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
  </>
)}

{/* POLYLINE HANDLES */}

                    {selectedObject?.type ===
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

        <div className="mobile-command-bar">

  <div className="mobile-command-status">
    Specify next point or [Undo]
  </div>

  <div className="mobile-command-title">
    <strong>
      {tool === "select"
        ? "SELECT"
        : tool.toUpperCase()}
    </strong>

    <span>
      {" "}Specify next point or
    </span>
  </div>

  <div className="mobile-quick-actions">

  <button
    onClick={() =>
      changeTool("select")
    }
  >
    Select
  </button>

  <button
    onClick={() => {
      const query =
        window.prompt(
          "Find object type:",
          "line"
        );

      if (
        !query ||
        !query.trim()
      ) {
        return;
      }

      const search =
        query
          .trim()
          .toLowerCase();

      const index =
        objects.findIndex(
          (object) =>
            object.type
              ?.toLowerCase()
              .includes(search) ||
            (
              object.text || ""
            )
              .toLowerCase()
              .includes(search)
        );

      if (index === -1) {
        window.alert(
          "Object not found."
        );
        return;
      }

      setSelectedIndex(index);

      setSelectedIndexes([
        index,
      ]);

      setTool("select");
    }}
  >
    🔍 Find
  </button>

  <button
    onClick={() =>
      changeTool("measure")
    }
  >
    📏 Measure
  </button>

  <button
    onClick={() =>
      changeTool("line")
    }
  >
    🖊 Draw
  </button>

</div>

  <div className="mobile-command-controls">

    <button
      onClick={undo}
      disabled={past.length === 0}
    >
      Undo
    </button>

    <button
      onClick={() =>
        changeTool("select")
      }
    >
      esc
    </button>

    <button
  onClick={() => {
    const query = window.prompt(
      "Find object type:",
      "line"
    );

    if (!query || !query.trim()) {
      return;
    }

    const search = query.trim().toLowerCase();

    const index = objects.findIndex(
      (object) =>
        object.type?.toLowerCase().includes(search) ||
        (object.text || "")
          .toLowerCase()
          .includes(search)
    );

    if (index === -1) {
      window.alert("Object not found.");
      return;
    }

    setSelectedIndex(index);
    setSelectedIndexes([index]);
    setTool("select");
  }}
>
  🔍 Find
</button>

    <input
  type="text"
  value={commandText}
  onChange={(e) =>
    setCommandText(e.target.value)
  }
  placeholder="Type a command"
/>

    <button>
      Enter
    </button>

  </div>

</div>

{commandText.trim() !== "" && (
  <div className="command-suggestions">

    {[
      "Find",
      "Line",
      "Circle",
      "Rectangle",
      "Polyline",
      "Measure",
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
          key={command}
          onClick={() => {
            if (command === "Find") {
              window.alert(
                "Find command selected"
              );
            } else {
              changeTool(
                command.toLowerCase()
              );
            }

            setCommandText("");
          }}
        >
          {command}
        </button>
      ))}

  </div>
)}

      </div>

      {/* ARC HANDLES */}

{selectedObject?.type ===
  "arc" && (
  <>
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
      radius={7}
      fill="yellow"
      stroke="black"
      strokeWidth={2}
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
      radius={8}
      fill="yellow"
      stroke="black"
      strokeWidth={2}
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
      radius={7}
      fill="yellow"
      stroke="black"
      strokeWidth={2}
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
