import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_DIR = os.path.join(ROOT, "assets", "models")
EXPORT_DIR = os.path.join(ROOT, "tools", "blender", "export")
BLEND_PATH = os.path.join(ROOT, "tools", "blender", "PullCheckCatalog.blend")
REPORT_PATH = os.path.join(ROOT, "tools", "blender", "catalog_report.json")
SLEEVE_OUTLINE = os.path.join(ROOT, "tools", "blender", "sleeve_outline.json")
CARD_BACK = os.path.join(ROOT, "assets", "card-back.jpg")

MATERIALS = {
    "CardFront": {"color": (0.85, 0.85, 0.85), "roughness": 0.45},
    "CardBack": {"color": (0.2, 0.32, 0.62), "roughness": 0.5},
    "CardEdge": {"color": (0.88, 0.87, 0.84), "roughness": 0.85},
    "FoilFront": {"color": (0.78, 0.79, 0.83), "roughness": 0.32, "metallic": 0.6},
    "FoilBack": {"color": (0.68, 0.69, 0.73), "roughness": 0.36, "metallic": 0.6},
    "FoilEdge": {"color": (0.74, 0.75, 0.78), "roughness": 0.4, "metallic": 0.5},
    "BoardFront": {"color": (0.86, 0.84, 0.8), "roughness": 0.6},
    "BoardBack": {"color": (0.74, 0.72, 0.68), "roughness": 0.65},
    "BoardSide": {"color": (0.8, 0.78, 0.74), "roughness": 0.62},
    "BoardTop": {"color": (0.83, 0.81, 0.77), "roughness": 0.62},
    "BoardEdge": {"color": (0.9, 0.88, 0.84), "roughness": 0.85},
    "Plastic": {"color": (1.0, 1.0, 1.0), "roughness": 0.05, "alpha": 0.16},
    "TinLid": {"color": (0.78, 0.8, 0.84), "roughness": 0.42},
    "TinSide": {"color": (0.72, 0.74, 0.78), "roughness": 0.44},
    "TinBottom": {"color": (0.8, 0.81, 0.84), "roughness": 0.4},
}

TRIANGLE_TARGETS = {
    "Card": (100, 400),
    "SinglePack": (500, 1000),
    "SleevedBooster": (150, 800),
    "BlisterPack": (800, 2000),
    "2PackBlister": (700, 1500),
    "3PackBlister": (1000, 3000),
    "BoosterBundle": (700, 1500),
    "ETB": (1000, 2500),
    "PokemonCenterETB": (1000, 2500),
    "Tin": (500, 1500),
    "MiniTin": (400, 1000),
    "CollectionBox": (1000, 3000),
    "SpecialCollectionBox": (1000, 3000),
    "PremiumCollectionBox": (2000, 5000),
    "PosterCollection": (1000, 3000),
    "LargePremiumBox": (2000, 5000),
    "BoosterBox": (200, 1000),
}

APP_KINDS = {
    "Card": "card",
    "SinglePack": "pack",
    "SleevedBooster": "sleeved",
    "BlisterPack": "blister",
    "2PackBlister": "blister2",
    "3PackBlister": "blister3",
    "BoosterBundle": "bundle",
    "ETB": "etb",
    "PokemonCenterETB": "pcetb",
    "Tin": "tin",
    "MiniTin": "minitin",
    "CollectionBox": "collection",
    "SpecialCollectionBox": "special",
    "PremiumCollectionBox": "premium",
    "PosterCollection": "poster",
    "LargePremiumBox": "large",
    "BoosterBox": "boosterbox",
}

OPEN_SHELLS = {"Blister"}

CARD = {"width": 0.0635, "height": 0.0889, "thickness": 0.00031, "radius": 0.00318}
PACK = {"width": 0.070, "height": 0.122, "crimp": 0.009, "puff": 0.0026, "teeth": 14, "tooth": 0.0012, "crimp_thickness": 0.0004}
PACK_DETAIL = {
    "full": {"columns": [0.0, 0.03, 0.09, 0.2, 0.35, 0.5, 0.65, 0.8, 0.91, 0.97, 1.0], "rows": [0.0, 0.05, 0.13, 0.25, 0.5, 0.75, 0.87, 0.95, 1.0], "teeth": 14},
    "lite": {"columns": [0.0, 0.06, 0.22, 0.5, 0.78, 0.94, 1.0], "rows": [0.0, 0.08, 0.3, 0.7, 0.92, 1.0], "teeth": 10},
}
BOARD_THICKNESS = 0.0008
TIN_SEGMENTS = 40
MINI_TIN_SEGMENTS = 32


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0


def material(name):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    spec = MATERIALS[name]
    mat = bpy.data.materials.new(name)
    if mat.node_tree is None:
        mat.use_nodes = True
    bsdf = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*spec["color"], 1.0)
    bsdf.inputs["Roughness"].default_value = spec["roughness"]
    bsdf.inputs["Metallic"].default_value = spec.get("metallic", 0.0)
    if "alpha" in spec:
        bsdf.inputs["Alpha"].default_value = spec["alpha"]
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = 0.0
        if hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
    return mat


class Builder:
    def __init__(self, product):
        self.product = product
        self.collection = bpy.data.collections.new(f"PokemonTCG_{product}")
        bpy.context.scene.collection.children.link(self.collection)
        self.objects = []

    def finish(self, part, bm, material_names):
        bm.normal_update()
        mesh = bpy.data.meshes.new(f"PokemonTCG_{self.product}_{part}")
        bm.to_mesh(mesh)
        bm.free()
        for name in material_names:
            mesh.materials.append(material(name))
        obj = bpy.data.objects.new(f"PokemonTCG_{self.product}_{part}", mesh)
        self.collection.objects.link(obj)
        self.objects.append(obj)
        return obj


def new_bm():
    bm = bmesh.new()
    bm.loops.layers.uv.new("UVMap")
    return bm, bm.loops.layers.uv.active


def rounded_rect(width, height, radius, segments, cx=0.0, cy=0.0):
    corners = [
        (width / 2 - radius, height / 2 - radius, 0),
        (-width / 2 + radius, height / 2 - radius, 90),
        (-width / 2 + radius, -height / 2 + radius, 180),
        (width / 2 - radius, -height / 2 + radius, 270),
    ]
    points = []
    for x, y, start in corners:
        for step in range(segments + 1):
            angle = math.radians(start + 90 * step / segments)
            points.append((cx + x + radius * math.cos(angle), cy + y + radius * math.sin(angle)))
    return points


def stadium(cx, cy, half_width, half_height, segments):
    straight = max(0.0, half_width - half_height)
    points = []
    for step in range(segments + 1):
        angle = -math.pi / 2 + math.pi * step / segments
        points.append((cx + straight + half_height * math.cos(angle), cy + half_height * math.sin(angle)))
    for step in range(segments + 1):
        angle = math.pi / 2 + math.pi * step / segments
        points.append((cx - straight + half_height * math.cos(angle), cy + half_height * math.sin(angle)))
    return points


def perimeter(points):
    lengths = [0.0]
    for index in range(len(points)):
        ax, ay = points[index]
        bx, by = points[(index + 1) % len(points)]
        lengths.append(lengths[-1] + math.hypot(bx - ax, by - ay))
    return lengths


def resample(points, count):
    lengths = perimeter(points)
    total = lengths[-1]
    result = []
    segment = 0
    for step in range(count):
        target = total * step / count
        while lengths[segment + 1] < target:
            segment += 1
        ax, ay = points[segment]
        bx, by = points[(segment + 1) % len(points)]
        span = lengths[segment + 1] - lengths[segment] or 1.0
        t = (target - lengths[segment]) / span
        result.append((ax + (bx - ax) * t, ay + (by - ay) * t))
    return result


def outward_normals(points):
    normals = []
    for index in range(len(points)):
        ax, ay = points[index - 1]
        bx, by = points[(index + 1) % len(points)]
        tx, ty = bx - ax, by - ay
        length = math.hypot(tx, ty) or 1.0
        normals.append((ty / length, -tx / length))
    return normals


def fill_loops(bm, loops, normal):
    edges = []
    for loop in loops:
        for index in range(len(loop)):
            edges.append(bm.edges.new((loop[index], loop[(index + 1) % len(loop)])))
    created = bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges, normal=normal)["geom"]
    faces = [element for element in created if isinstance(element, bmesh.types.BMFace)]
    for face in faces:
        face.normal_update()
    wrong = [face for face in faces if face.normal.dot(Vector(normal)) < 0]
    if wrong:
        bmesh.ops.reverse_faces(bm, faces=wrong)
    return faces


def walls(bm, uv, front, back, material_index, smooth=True):
    count = len(front)
    lengths = perimeter([(v.co.x, v.co.z) for v in front])
    total = lengths[-1] or 1.0
    faces = []
    for index in range(count):
        following = (index + 1) % count
        face = bm.faces.new((front[index], front[following], back[following], back[index]))
        face.material_index = material_index
        face.smooth = smooth
        coords = {
            front[index]: (lengths[index] / total, 1.0),
            back[index]: (lengths[index] / total, 0.0),
            front[following]: (lengths[index + 1] / total, 1.0),
            back[following]: (lengths[index + 1] / total, 0.0),
        }
        for loop in face.loops:
            loop[uv].uv = coords[loop.vert]
        faces.append(face)
    return faces


def planar_uv(face, uv, bounds, mirror=False):
    x0, x1, z0, z1 = bounds
    for loop in face.loops:
        u = (loop.vert.co.x - x0) / (x1 - x0)
        v = (loop.vert.co.z - z0) / (z1 - z0)
        loop[uv].uv = (1 - u if mirror else u, v)


def slab(bm, uv, loops, y_front, y_back, materials, bounds, transform=None, smooth_walls=False):
    front_loops = [[bm.verts.new(transform((x, y_front, z)) if transform else (x, y_front, z)) for x, z in loop] for loop in loops]
    back_loops = [[bm.verts.new(transform((x, y_back, z)) if transform else (x, y_back, z)) for x, z in loop] for loop in loops]
    front_normal = (0.0, -1.0, 0.0)
    back_normal = (0.0, 1.0, 0.0)
    if transform:
        origin = Vector(transform((0.0, 0.0, 0.0)))
        front_normal = tuple(Vector(transform((0.0, -1.0, 0.0))) - origin)
        back_normal = tuple(Vector(transform((0.0, 1.0, 0.0))) - origin)
    front_faces = fill_loops(bm, front_loops, front_normal)
    back_faces = fill_loops(bm, back_loops, back_normal)
    for face in front_faces:
        face.material_index = materials[0]
        planar_uv(face, uv, bounds)
    for face in back_faces:
        face.material_index = materials[1]
        planar_uv(face, uv, bounds, mirror=True)
    side_faces = []
    for front, back in zip(front_loops, back_loops):
        side_faces += walls(bm, uv, front, back, materials[2], smooth_walls)
    for edge in bm.edges:
        indices = {face.material_index for face in edge.link_faces}
        if materials[2] in indices and len(indices) > 1:
            edge.smooth = False
    return front_faces, back_faces, side_faces


def placement(offset=(0.0, 0.0, 0.0), rotation=0.0):
    matrix = Matrix.Translation(Vector(offset)) @ Matrix.Rotation(math.radians(rotation), 4, "Y")

    def apply(co):
        return tuple(matrix @ Vector(co))

    return apply


def build_card_part(builder, part, offset, rotation, bounds, front_material, back_material, edge_material, card_bounds=False):
    bm, uv = new_bm()
    outline = rounded_rect(CARD["width"], CARD["height"], CARD["radius"], 4 if not card_bounds else 10)
    transform = placement(offset, rotation)
    own = (-CARD["width"] / 2, CARD["width"] / 2, -CARD["height"] / 2, CARD["height"] / 2)
    front, back, _ = slab(bm, uv, [outline], -CARD["thickness"] / 2, CARD["thickness"] / 2, [0, 1, 2], own, transform)
    if not card_bounds:
        for face in front:
            planar_uv(face, uv, bounds)
        for face in back:
            planar_uv(face, uv, bounds, mirror=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return builder.finish(part, bm, [front_material, back_material, edge_material])


def build_card():
    builder = Builder("Card")
    build_card_part(builder, "Main", (0, 0, 0), 0, None, "CardFront", "CardBack", "CardEdge", card_bounds=True)
    return builder


def pack_thickness(u, v):
    edge = abs(2 * u - 1)
    across = max(0.0, 1.0 - edge ** 4) ** 0.25
    along = min(v, 1 - v) / 0.18
    return PACK["puff"] * across * min(1.0, along) ** 0.5


def build_pack_parts(builder, suffix, offset, rotation, bounds, front_material, back_material, edge_material, detail="full"):
    transform = placement(offset, rotation)
    columns = PACK_DETAIL[detail]["columns"]
    rows = PACK_DETAIL[detail]["rows"]
    width, height, crimp = PACK["width"], PACK["height"], PACK["crimp"]
    body_bottom = -height / 2 + crimp
    body_height = height - 2 * crimp

    bm, uv = new_bm()
    grid = {}
    for row, v in enumerate(rows):
        for column, u in enumerate(columns):
            x = (u - 0.5) * width
            z = body_bottom + v * body_height
            depth = pack_thickness(u, v)
            boundary = row in (0, len(rows) - 1) or column in (0, len(columns) - 1)
            if boundary:
                vert = bm.verts.new(transform((x, 0.0, z)))
                grid[("front", row, column)] = vert
                grid[("back", row, column)] = vert
            else:
                grid[("front", row, column)] = bm.verts.new(transform((x, -depth, z)))
                grid[("back", row, column)] = bm.verts.new(transform((x, depth, z)))
    for side, material_index in (("front", 0), ("back", 1)):
        for row in range(len(rows) - 1):
            for column in range(len(columns) - 1):
                quad = [
                    grid[(side, row, column)],
                    grid[(side, row, column + 1)],
                    grid[(side, row + 1, column + 1)],
                    grid[(side, row + 1, column)],
                ]
                face = bm.faces.new(quad if side == "front" else list(reversed(quad)))
                face.material_index = material_index
                face.smooth = True
    for face in bm.faces:
        local = [Vector(v.co) for v in face.verts]
        for loop, point in zip(face.loops, local):
            inverse = placement((-offset[0], -offset[1], -offset[2]), 0)(tuple(point))
            unrotated = Matrix.Rotation(math.radians(-rotation), 4, "Y") @ Vector(inverse)
            u = (unrotated.x + width / 2) / width
            v = (unrotated.z + height / 2) / height
            if bounds:
                world = Vector(loop.vert.co)
                u_world = (world.x - bounds[0]) / (bounds[1] - bounds[0])
                v_world = (world.z - bounds[2]) / (bounds[3] - bounds[2])
                loop[uv].uv = (u_world if face.material_index == 0 else 1 - u_world, v_world)
            else:
                loop[uv].uv = (u if face.material_index == 0 else 1 - u, v)
    builder.finish(f"Pack{suffix}" if suffix else "Main", bm, [front_material, back_material, edge_material])

    for name, sign in (("CrimpTop", 1), ("CrimpBottom", -1)):
        bm, uv = new_bm()
        inner = sign * (height / 2 - crimp)
        outer = sign * height / 2
        teeth = PACK_DETAIL[detail]["teeth"]
        points = [(width / 2, inner)]
        for step in range(teeth * 2 + 1):
            x = width / 2 - width * step / (teeth * 2)
            z = outer - sign * (PACK["tooth"] if step % 2 else 0.0)
            points.append((x, z))
        points.append((-width / 2, inner))
        if sign < 0:
            points.reverse()
        local_bounds = (-width / 2, width / 2, -height / 2, height / 2)
        front, back, edges = slab(
            bm, uv, [points], -PACK["crimp_thickness"] / 2, PACK["crimp_thickness"] / 2, [0, 1, 2], local_bounds, transform
        )
        if bounds:
            for face in front:
                planar_uv(face, uv, bounds)
            for face in back:
                planar_uv(face, uv, bounds, mirror=True)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        builder.finish(f"Pack{suffix}_{name}" if suffix else name, bm, [front_material, back_material, edge_material])


def build_single_pack():
    builder = Builder("SinglePack")
    build_pack_parts(builder, "", (0, 0, 0), 0, None, "FoilFront", "FoilBack", "FoilEdge")
    return builder


def build_sleeved_booster():
    builder = Builder("SleevedBooster")
    with open(SLEEVE_OUTLINE, encoding="utf-8") as handle:
        outline = json.load(handle)
    height = 0.136
    width = height * outline["aspect"]

    def to_plane(u, v):
        return ((u - 0.5) * width, (0.5 - v) * height)

    outer = []
    for u, v in outline["outer"]:
        point = to_plane(u, v)
        if not outer or math.dist(point, outer[-1]) > 1e-6:
            outer.append(point)
    if math.dist(outer[0], outer[-1]) < 1e-6:
        outer.pop()
    loops = [outer]
    hole = outline.get("hole")
    if hole:
        cx, cy = to_plane(0.5, (hole["top"] + hole["bottom"]) / 2)
        loops.append(stadium(cx, cy, hole["halfWidth"] * width, (hole["bottom"] - hole["top"]) / 2 * height, 8))
    bm, uv = new_bm()
    bounds = (-width / 2, width / 2, -height / 2, height / 2)
    slab(bm, uv, loops, -0.0025, 0.0025, [0, 1, 2], bounds)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    builder.finish("Main", bm, ["BoardFront", "BoardBack", "BoardEdge"])
    return builder


def build_cardboard(builder, width, height, hole_from_top):
    bm, uv = new_bm()
    outline = rounded_rect(width, height, 0.006, 4)
    hole = stadium(0.0, height / 2 - hole_from_top, 0.013, 0.0035, 6)
    bounds = (-width / 2, width / 2, -height / 2, height / 2)
    slab(bm, uv, [outline, hole], -BOARD_THICKNESS / 2, BOARD_THICKNESS / 2, [0, 1, 1], bounds)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    builder.finish("Cardboard", bm, ["BoardFront", "BoardBack"])
    return bounds


def build_bubble(builder, part, cx, cz, width, height, depth, bounds):
    bm, uv = new_bm()
    base = resample(rounded_rect(width, height, min(width, height) * 0.16, 6, cx, cz), 32)
    normals = outward_normals(base)
    y_board = -BOARD_THICKNESS / 2 - 0.0002
    profile = [
        (0.004, y_board),
        (0.0, y_board),
        (-0.0005, y_board - 0.0006),
        (-0.0022, y_board - depth + 0.0018),
        (-0.0042, y_board - depth),
    ]
    rings = []
    for offset, y in profile:
        rings.append([bm.verts.new((x + nx * offset, y, z + nz * offset)) for (x, z), (nx, nz) in zip(base, normals)])
    count = len(base)
    for ring_a, ring_b in zip(rings, rings[1:]):
        for index in range(count):
            following = (index + 1) % count
            face = bm.faces.new((ring_a[index], ring_a[following], ring_b[following], ring_b[index]))
            face.smooth = True
            planar_uv(face, uv, bounds)
    center = bm.verts.new((cx, y_board - depth, cz))
    for index in range(count):
        face = bm.faces.new((rings[-1][index], rings[-1][(index + 1) % count], center))
        face.smooth = True
        planar_uv(face, uv, bounds)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    if sum(face.normal.y * face.calc_area() for face in bm.faces) > 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    for face in bm.faces:
        face.material_index = 0
    builder.finish(part, bm, ["Plastic"])


def build_coin(builder, part, cx, cz, radius, thickness, bounds):
    bm, uv = new_bm()
    y_front = -BOARD_THICKNESS / 2 - 0.0002 - thickness
    y_back = -BOARD_THICKNESS / 2 - 0.0002
    ring = [(cx + radius * math.cos(2 * math.pi * step / 20), cz + radius * math.sin(2 * math.pi * step / 20)) for step in range(20)]
    bevel = [(cx + (x - cx) * 0.9, cz + (z - cz) * 0.9) for x, z in ring]
    front_bevel = [bm.verts.new((x, y_front, z)) for x, z in bevel]
    front_rim = [bm.verts.new((x, y_front + thickness * 0.3, z)) for x, z in ring]
    back_rim = [bm.verts.new((x, y_back, z)) for x, z in ring]
    center_front = bm.verts.new((cx, y_front, cz))
    center_back = bm.verts.new((cx, y_back, cz))
    count = len(ring)
    for index in range(count):
        following = (index + 1) % count
        faces = [
            (bm.faces.new((center_front, front_bevel[following], front_bevel[index])), 0, False),
            (bm.faces.new((front_bevel[index], front_bevel[following], front_rim[following], front_rim[index])), 0, True),
            (bm.faces.new((front_rim[index], front_rim[following], back_rim[following], back_rim[index])), 1, True),
            (bm.faces.new((center_back, back_rim[index], back_rim[following])), 1, False),
        ]
        for face, material_index, smooth in faces:
            face.material_index = material_index
            face.smooth = smooth
            planar_uv(face, uv, bounds)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    builder.finish(part, bm, ["FoilFront", "FoilFront"])


def build_blister(product, board_width, board_height, packs, promos, coins, bubbles):
    builder = Builder(product)
    bounds = build_cardboard(builder, board_width, board_height, 0.012)
    pack_y = -BOARD_THICKNESS / 2 - 0.0002 - PACK["puff"] - 0.0002
    for index, (x, z, rotation, lift) in enumerate(packs):
        suffix = f"_{index + 1:02d}" if len(packs) > 1 else ""
        build_pack_parts(builder, suffix or "_01", (x, pack_y - lift, z), rotation, bounds, "FoilFront", "BoardBack", "BoardBack", detail="lite")
    card_y = -BOARD_THICKNESS / 2 - 0.0002 - CARD["thickness"] / 2 - 0.0001
    for index, (x, z, rotation) in enumerate(promos):
        build_card_part(builder, "PromoCard" if index == 0 else f"PromoCard_{index + 1:02d}", (x, card_y, z), rotation, bounds, "BoardFront", "BoardBack", "BoardBack")
    for index, (x, z, radius) in enumerate(coins):
        build_coin(builder, "Coin" if index == 0 else f"Coin_{index + 1:02d}", x, z, radius, 0.003, bounds)
    for index, (cx, cz, width, height, depth) in enumerate(bubbles):
        build_bubble(builder, "Blister" if index == 0 else f"Blister_{index + 1:02d}", cx, cz, width, height, depth, bounds)
    return builder


def box_uv(face, uv, size, role_front, role_back, role_side, role_top):
    width, height, depth = size
    normal = face.normal
    axis = max(range(3), key=lambda index: abs(normal[index]))
    if axis == 1:
        face.material_index = role_front if normal.y < 0 else role_back
    elif axis == 0:
        face.material_index = role_side
    else:
        face.material_index = role_top
    for loop in face.loops:
        co = loop.vert.co
        across = min(1.0, max(0.0, (co.x + width / 2) / width))
        up = min(1.0, max(0.0, (co.z + height / 2) / height))
        back = min(1.0, max(0.0, (co.y + depth / 2) / depth))
        if axis == 1 and normal.y < 0:
            loop[uv].uv = (across, up)
        elif axis == 1:
            loop[uv].uv = (1 - across, up)
        elif axis == 0 and normal.x < 0:
            loop[uv].uv = (1 - back, up)
        elif axis == 0:
            loop[uv].uv = (back, up)
        else:
            loop[uv].uv = (across, 1 - back)


def add_beveled_box(bm, center, size, bevel, segments=2):
    result = bmesh.ops.create_cube(bm, size=1.0)
    verts = result["verts"]
    for vert in verts:
        vert.co.x = vert.co.x * size[0] + center[0]
        vert.co.y = vert.co.y * size[2] + center[1]
        vert.co.z = vert.co.z * size[1] + center[2]
    edges = list({edge for vert in verts for edge in vert.link_edges})
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, offset_type="OFFSET", segments=segments, profile=0.5, affect="EDGES", clamp_overlap=True)


def flatten_shading(bm, big_area):
    for face in bm.faces:
        face.smooth = True
    for edge in bm.edges:
        edge.smooth = not any(face.calc_area() > big_area for face in edge.link_faces) and edge.calc_face_angle(0.0) < math.radians(50)


def build_closed_box(builder, part, size, center, bevel, frame_size, materials, segments=2):
    bm, uv = new_bm()
    add_beveled_box(bm, center, size, bevel, segments)
    bm.normal_update()
    for face in bm.faces:
        box_uv(face, uv, frame_size, 0, 1, 2, 3)
    flatten_shading(bm, frame_size[0] * frame_size[1] * 0.02)
    return builder.finish(part, bm, materials)


def build_lid_shell(builder, part, size, bottom, thickness, frame_size, materials):
    width, height, depth = size
    top = bottom + height
    bm, uv = new_bm()
    outer = {}
    inner = {}
    for sx in (-1, 1):
        for sy in (-1, 1):
            for level, z in (("bottom", bottom), ("top", top)):
                outer[(sx, sy, level)] = bm.verts.new((sx * width / 2, sy * depth / 2, z))
                inner_z = bottom if level == "bottom" else top - thickness
                inner[(sx, sy, level)] = bm.verts.new((sx * (width / 2 - thickness), sy * (depth / 2 - thickness), inner_z))

    def quad(points):
        return bm.faces.new(points)

    for ring, sign in ((outer, 1), (inner, -1)):
        faces = [
            [ring[(-1, -1, "top")], ring[(1, -1, "top")], ring[(1, 1, "top")], ring[(-1, 1, "top")]],
            [ring[(-1, -1, "bottom")], ring[(1, -1, "bottom")], ring[(1, -1, "top")], ring[(-1, -1, "top")]],
            [ring[(1, 1, "bottom")], ring[(-1, 1, "bottom")], ring[(-1, 1, "top")], ring[(1, 1, "top")]],
            [ring[(-1, 1, "bottom")], ring[(-1, -1, "bottom")], ring[(-1, -1, "top")], ring[(-1, 1, "top")]],
            [ring[(1, -1, "bottom")], ring[(1, 1, "bottom")], ring[(1, 1, "top")], ring[(1, -1, "top")]],
        ]
        for points in faces:
            quad(points if sign > 0 else list(reversed(points)))
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    for index in range(4):
        a = corners[index]
        b = corners[(index + 1) % 4]
        quad([outer[(*a, "bottom")], inner[(*a, "bottom")], inner[(*b, "bottom")], outer[(*b, "bottom")]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    outer_edges = [edge for edge in bm.edges if all(vert in outer.values() for vert in edge.verts) and edge.calc_face_angle(0.0) > math.radians(60)]
    bmesh.ops.bevel(bm, geom=outer_edges, offset=min(0.002, thickness * 1.5), offset_type="OFFSET", segments=2, profile=0.5, affect="EDGES", clamp_overlap=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    center = Vector((0.0, 0.0, (bottom + top) / 2))
    inner_set = set(inner.values())
    for face in bm.faces:
        facing_in = face.normal.dot(center - face.calc_center_median()) > 0 and any(vert in inner_set for vert in face.verts)
        box_uv(face, uv, frame_size, 0, 1, 2, 3)
        if facing_in:
            face.material_index = 3
    flatten_shading(bm, frame_size[0] * frame_size[1] * 0.02)
    return builder.finish(part, bm, materials)


def build_lidded_box(product, width, height, depth, base_show, sleeve=False, lid_thickness=0.0012):
    builder = Builder(product)
    frame = (width, height, depth)
    inset = 0.0016
    base_height = height * (1 - base_show * 0.3)
    build_closed_box(
        builder,
        "Body",
        (width - 2 * inset, base_height, depth - 2 * inset),
        (0.0, 0.0, -height / 2 + base_height / 2),
        0.0015,
        frame,
        ["BoardFront", "BoardBack", "BoardSide", "BoardTop"],
    )
    lid_bottom = -height / 2 + height * base_show
    build_lid_shell(builder, "Lid", (width, height - height * base_show, depth), lid_bottom, lid_thickness, frame, ["BoardFront", "BoardBack", "BoardSide", "BoardTop"])
    if sleeve:
        bm, uv = new_bm()
        sleeve_depth = depth + 0.0016
        sleeve_height = height - height * base_show + 0.0016
        sleeve_bottom = lid_bottom - 0.0008
        sleeve_width = width * 0.999
        thickness = 0.0005
        profile = [
            (-sleeve_depth / 2, sleeve_bottom),
            (-sleeve_depth / 2, sleeve_bottom + sleeve_height),
            (sleeve_depth / 2, sleeve_bottom + sleeve_height),
            (sleeve_depth / 2, sleeve_bottom),
        ]
        inner_profile = [
            (-sleeve_depth / 2 + thickness, sleeve_bottom),
            (-sleeve_depth / 2 + thickness, sleeve_bottom + sleeve_height - thickness),
            (sleeve_depth / 2 - thickness, sleeve_bottom + sleeve_height - thickness),
            (sleeve_depth / 2 - thickness, sleeve_bottom),
        ]
        section = profile + list(reversed(inner_profile))
        left = [bm.verts.new((-sleeve_width / 2, y, z)) for y, z in section]
        right = [bm.verts.new((sleeve_width / 2, y, z)) for y, z in section]
        count = len(section)
        for index in range(count):
            following = (index + 1) % count
            bm.faces.new((left[index], left[following], right[following], right[index]))
        bm.faces.new(list(reversed(left)))
        bm.faces.new(right)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.normal_update()
        for face in bm.faces:
            box_uv(face, uv, frame, 0, 1, 2, 3)
            face.smooth = False
        builder.finish("Sleeve", bm, ["BoardFront", "BoardBack", "BoardSide", "BoardTop"])
    return builder


def build_window_box(product, width, height, depth, window, cavity_depth, contents):
    builder = Builder(product)
    frame = (width, height, depth)
    bounds = (-width / 2, width / 2, -height / 2, height / 2)
    x0 = -width / 2 + window[0] * width
    x1 = -width / 2 + window[1] * width
    z0 = -height / 2 + window[2] * height
    z1 = -height / 2 + window[3] * height
    bm, uv = new_bm()
    add_beveled_box(bm, (0.0, 0.0, 0.0), frame, 0.0, 1)
    front = next(face for face in bm.faces if face.normal.y < -0.9)
    outer_loop = [loop.vert for loop in front.loops]
    bm.faces.remove(front)
    y_front = -depth / 2
    window_loop = [bm.verts.new((x, y_front, z)) for x, z in ((x0, z0), (x1, z0), (x1, z1), (x0, z1))]
    edges = []
    for loop in (outer_loop, window_loop):
        for index in range(len(loop)):
            a, b = loop[index], loop[(index + 1) % len(loop)]
            existing = bm.edges.get((a, b))
            edges.append(existing or bm.edges.new((a, b)))
    created = bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=True, edges=edges, normal=(0.0, -1.0, 0.0))["geom"]
    frame_faces = [element for element in created if isinstance(element, bmesh.types.BMFace)]
    for face in frame_faces:
        face.normal_update()
        if face.normal.y > 0:
            face.normal_flip()
    back_loop = [bm.verts.new((v.co.x, y_front + cavity_depth, v.co.z)) for v in window_loop]
    for index in range(4):
        following = (index + 1) % 4
        bm.faces.new((window_loop[index], window_loop[following], back_loop[following], back_loop[index]))
    bm.faces.new(list(back_loop))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    outer_edges = [edge for edge in bm.edges if edge.calc_face_angle(0.0) > math.radians(60) and all(abs(abs(v.co.x) - width / 2) < 1e-6 or abs(abs(v.co.y) - depth / 2) < 1e-6 or abs(abs(v.co.z) - height / 2) < 1e-6 for v in edge.verts)]
    outer_edges = [edge for edge in outer_edges if not all(vert in window_loop for vert in edge.verts)]
    bmesh.ops.bevel(bm, geom=outer_edges, offset=0.0015, offset_type="OFFSET", segments=2, profile=0.5, affect="EDGES", clamp_overlap=True)
    bm.normal_update()
    for face in bm.faces:
        center = face.calc_center_median()
        in_cavity = x0 - 1e-5 <= center.x <= x1 + 1e-5 and z0 - 1e-5 <= center.z <= z1 + 1e-5 and center.y > y_front + 1e-5
        if in_cavity and face.normal.y < -0.9:
            face.material_index = 0
            planar_uv(face, uv, bounds)
        elif in_cavity:
            face.material_index = 2
            for loop in face.loops:
                loop[uv].uv = (0.02, (loop.vert.co.z + height / 2) / height)
        else:
            box_uv(face, uv, frame, 0, 1, 2, 2)
    flatten_shading(bm, width * height * 0.02)
    builder.finish("Body", bm, ["BoardFront", "BoardBack", "BoardSide"])

    bm, uv = new_bm()
    pane = [bm.verts.new((x, y_front + 0.0008, z)) for x, z in ((x0, z0), (x1, z0), (x1, z1), (x0, z1))]
    face = bm.faces.new(pane)
    face.normal_update()
    if face.normal.y > 0:
        face.normal_flip()
    planar_uv(face, uv, bounds)
    builder.finish("Window", bm, ["Plastic"])

    back_y = y_front + cavity_depth
    base_y = back_y - 0.0006
    for kind, name, x, z, rotation, extra in contents:
        if kind == "card":
            stack = extra
            for layer in range(stack):
                part = name if stack == 1 else f"{name}_{layer + 1:02d}"
                build_card_part(builder, part, (x + layer * 0.003, base_y, z - layer * 0.002), rotation - layer * 3, bounds, "BoardFront", "BoardBack", "BoardBack")
                base_y -= 0.0008
            base_y -= 0.0012
        elif kind == "coin":
            build_coin_at(builder, name, x, z, extra, 0.0032, base_y + 0.0002, bounds, ["BoardFront", "BoardSide"])
            base_y -= 0.0036
    return builder


def build_coin_at(builder, part, cx, cz, radius, thickness, y_back, bounds, materials):
    bm, uv = new_bm()
    y_front = y_back - thickness
    ring = [(cx + radius * math.cos(2 * math.pi * step / 20), cz + radius * math.sin(2 * math.pi * step / 20)) for step in range(20)]
    front = [bm.verts.new((x, y_front, z)) for x, z in ring]
    back = [bm.verts.new((x, y_back, z)) for x, z in ring]
    center_front = bm.verts.new((cx, y_front, cz))
    center_back = bm.verts.new((cx, y_back, cz))
    count = len(ring)
    for index in range(count):
        following = (index + 1) % count
        for face, material_index in (
            (bm.faces.new((center_front, front[following], front[index])), 0),
            (bm.faces.new((front[index], front[following], back[following], back[index])), 1),
            (bm.faces.new((center_back, back[index], back[following])), 1),
        ):
            face.material_index = material_index
            planar_uv(face, uv, bounds)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    builder.finish(part, bm, materials)


def build_tin(product, width, height, depth, radius, segments, lid_depth, dome):
    builder = Builder(product)
    outline = resample(rounded_rect(width, height, radius, 8), segments)
    normals = outward_normals(outline)
    xs = [x for x, _ in outline]
    zs = [z for _, z in outline]
    bounds = (min(xs), max(xs), min(zs), max(zs))
    wall = 0.0004
    front_y = -depth / 2

    bm, uv = new_bm()
    center = bm.verts.new((0.0, front_y - dome, 0.0))
    ring_specs = [(0.55, front_y - dome * 0.7), (0.92, front_y - dome * 0.1)]
    rings = [[bm.verts.new((x * scale, y, z * scale)) for x, z in outline] for scale, y in ring_specs]
    rim = [bm.verts.new((x + nx * 0.0012, front_y + 0.0008, z + nz * 0.0012)) for (x, z), (nx, nz) in zip(outline, normals)]
    skirt = [bm.verts.new((x + nx * 0.0012, front_y + lid_depth, z + nz * 0.0012)) for (x, z), (nx, nz) in zip(outline, normals)]
    skirt_inner = [bm.verts.new((x + nx * (0.0012 - wall), front_y + lid_depth, z + nz * (0.0012 - wall))) for (x, z), (nx, nz) in zip(outline, normals)]
    top_inner = [bm.verts.new((x + nx * (0.0012 - wall), front_y + wall, z + nz * (0.0012 - wall))) for (x, z), (nx, nz) in zip(outline, normals)]
    inner_center = bm.verts.new((0.0, front_y + wall, 0.0))
    count = len(outline)
    for index in range(count):
        following = (index + 1) % count
        face = bm.faces.new((center, rings[0][following], rings[0][index]))
        face.material_index = 0
    for ring_a, ring_b in ((rings[0], rings[1]), (rings[1], rim)):
        for index in range(count):
            following = (index + 1) % count
            face = bm.faces.new((ring_a[index], ring_a[following], ring_b[following], ring_b[index]))
            face.material_index = 0
    for ring_a, ring_b, material_index in ((rim, skirt, 1), (skirt, skirt_inner, 2), (skirt_inner, top_inner, 2)):
        for index in range(count):
            following = (index + 1) % count
            face = bm.faces.new((ring_a[index], ring_a[following], ring_b[following], ring_b[index]))
            face.material_index = material_index
    for index in range(count):
        following = (index + 1) % count
        face = bm.faces.new((inner_center, top_inner[index], top_inner[following]))
        face.material_index = 2
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    tin_uvs(bm, uv, bounds, True, outline, depth)
    builder.finish("Lid", bm, ["TinLid", "TinSide", "TinBottom"])

    bm, uv = new_bm()
    body_offset = 0.0012 - wall - 0.0003
    top_y = front_y + wall + 0.0005
    back_y = depth / 2
    top = [bm.verts.new((x + nx * body_offset, top_y, z + nz * body_offset)) for (x, z), (nx, nz) in zip(outline, normals)]
    lower = [bm.verts.new((x + nx * body_offset, back_y - 0.002, z + nz * body_offset)) for (x, z), (nx, nz) in zip(outline, normals)]
    bottom_ring = [bm.verts.new((x + nx * (body_offset - 0.0015), back_y, z + nz * (body_offset - 0.0015))) for (x, z), (nx, nz) in zip(outline, normals)]
    top_center = bm.verts.new((0.0, top_y, 0.0))
    bottom_center = bm.verts.new((0.0, back_y, 0.0))
    for index in range(count):
        following = (index + 1) % count
        for verts, material_index in (
            ((top_center, top[following], top[index]), 2),
            ((top[index], top[following], lower[following], lower[index]), 1),
            ((lower[index], lower[following], bottom_ring[following], bottom_ring[index]), 1),
            ((bottom_center, bottom_ring[index], bottom_ring[following]), 2),
        ):
            face = bm.faces.new(verts)
            face.material_index = material_index
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    tin_uvs(bm, uv, bounds, False, outline, depth)
    builder.finish("Body", bm, ["TinLid", "TinSide", "TinBottom"])
    return builder


def tin_uvs(bm, uv, bounds, lid, outline, depth):
    x0, x1, z0, z1 = bounds
    count = len(outline)
    angles = [math.atan2(z, x) for x, z in outline]
    for face in bm.faces:
        face.smooth = True
        if face.material_index == 1:
            positions = []
            for loop in face.loops:
                co = loop.vert.co
                angle = math.atan2(co.z, co.x)
                nearest = min(range(count), key=lambda index: abs(math.remainder(angles[index] - angle, 2 * math.pi)))
                positions.append(nearest)
            if max(positions) - min(positions) > count / 2:
                positions = [position + count if position < count / 2 else position for position in positions]
            for loop, position in zip(face.loops, positions):
                band = 0.0 if lid else 0.5
                along = min(1.0, max(0.0, (loop.vert.co.y + depth / 2) / depth))
                loop[uv].uv = (min(1.0, position / count), band + 0.5 * along)
            continue
        for loop in face.loops:
            co = loop.vert.co
            u = (co.x - x0) / (x1 - x0)
            v = (co.z - z0) / (z1 - z0)
            if face.material_index == 2:
                loop[uv].uv = (min(1.0, max(0.0, 1 - u)), min(1.0, max(0.0, v)))
            else:
                loop[uv].uv = (min(1.0, max(0.0, u)), min(1.0, max(0.0, v)))
    for edge in bm.edges:
        edge.smooth = edge.calc_face_angle(0.0) < math.radians(55)


def build_bundle():
    builder = Builder("BoosterBundle")
    frame = (0.150, 0.178, 0.078)
    build_closed_box(builder, "Body", frame, (0.0, 0.0, 0.0), 0.0018, frame, ["BoardFront", "BoardBack", "BoardSide", "BoardTop"], segments=3)
    return builder


def center_product(builder):
    corners = []
    for obj in builder.objects:
        corners += [obj.matrix_world @ Vector(vert.co) for vert in obj.data.vertices]
    lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    center = (lo + hi) / 2
    for obj in builder.objects:
        obj.data.transform(Matrix.Translation(-center))
        obj.data.update()
    return hi - lo


def quality_report(builder, dimensions):
    report = {"product": f"PokemonTCG_{builder.product}", "objects": [], "issues": []}
    triangles = 0
    materials = set()
    boxes = []
    for obj in builder.objects:
        mesh = obj.data
        mesh.calc_loop_triangles()
        tris = len(mesh.loop_triangles)
        triangles += tris
        materials.update(slot.material.name for slot in obj.material_slots)
        bm = bmesh.new()
        bm.from_mesh(mesh)
        non_manifold = sum(1 for edge in bm.edges if len(edge.link_faces) != 2)
        loose = sum(1 for vert in bm.verts if not vert.link_faces)
        before = len(bm.verts)
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
        duplicates = before - len(bm.verts)
        volume = bm.calc_volume(signed=True) if non_manifold == 0 else None
        islands = count_islands(bm)
        bm.free()
        open_shell = any(token in obj.name for token in OPEN_SHELLS) or obj.name.endswith("_Window")
        uv_layer = mesh.uv_layers.active
        uv_values = [value for data in uv_layer.data for value in data.uv] if uv_layer else []
        uv_ok = bool(uv_values) and min(uv_values) >= -0.01 and max(uv_values) <= 1.01
        corners = [Vector(vert.co) for vert in mesh.vertices]
        lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
        hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
        boxes.append((obj.name, lo, hi))
        entry = {
            "name": obj.name,
            "triangles": tris,
            "materials": [slot.material.name for slot in obj.material_slots],
            "nonManifoldEdges": non_manifold,
            "openShell": open_shell,
            "looseVerts": loose,
            "duplicateVerts": duplicates,
            "islands": islands,
            "outwardNormals": None if volume is None else volume > 0,
            "uvInRange": uv_ok,
            "sizeMm": [round(value * 1000, 1) for value in (hi - lo)],
        }
        report["objects"].append(entry)
        if non_manifold and not open_shell:
            report["issues"].append(f"{obj.name}: {non_manifold} non-manifold edges")
        if loose:
            report["issues"].append(f"{obj.name}: {loose} loose verts")
        if duplicates:
            report["issues"].append(f"{obj.name}: {duplicates} duplicate verts")
        if volume is not None and volume <= 0:
            report["issues"].append(f"{obj.name}: inverted normals")
        if islands > 1:
            report["issues"].append(f"{obj.name}: {islands} disconnected pieces")
        if not uv_ok:
            report["issues"].append(f"{obj.name}: UVs outside 0-1")
    for index, (name_a, lo_a, hi_a) in enumerate(boxes):
        for name_b, lo_b, hi_b in boxes[index + 1:]:
            if is_container_pair(name_a, name_b):
                continue
            overlap = [min(hi_a[axis], hi_b[axis]) - max(lo_a[axis], lo_b[axis]) for axis in range(3)]
            if all(value > 0.0003 for value in overlap):
                report["issues"].append(f"bounding boxes overlap: {name_a} / {name_b}")
    target = TRIANGLE_TARGETS.get(builder.product)
    report["triangles"] = triangles
    report["target"] = target
    report["materialCount"] = len(materials)
    report["sizeMm"] = [round(value * 1000, 1) for value in dimensions]
    if target and triangles > target[1]:
        report["issues"].append(f"triangle count {triangles} above {target[1]}")
    report["underTarget"] = bool(target and triangles < target[0])
    if len(materials) > 4:
        report["issues"].append(f"{len(materials)} materials")
    return report


def is_container_pair(name_a, name_b):
    containers = ("_Body", "_Lid", "_Sleeve", "_Cardboard", "_Blister", "_Window")
    pack_a = name_a.split("_Crimp")[0]
    pack_b = name_b.split("_Crimp")[0]
    if pack_a == pack_b:
        return True
    return any(name.endswith(token) or f"{token}_" in name for name in (name_a, name_b) for token in containers)


def count_islands(bm):
    seen = set()
    islands = 0
    for vert in bm.verts:
        if vert in seen:
            continue
        islands += 1
        stack = [vert]
        seen.add(vert)
        while stack:
            current = stack.pop()
            for edge in current.link_edges:
                other = edge.other_vert(current)
                if other not in seen:
                    seen.add(other)
                    stack.append(other)
    return islands


def export_json(builder, kind):
    positions, normals, uvs, indices, groups = [], [], [], [], []
    lookup = {}
    by_material = {}
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in builder.objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        corner_normals = mesh.corner_normals
        uv_data = mesh.uv_layers.active.data
        matrix = obj.matrix_world
        rotation = matrix.to_3x3()
        for triangle in mesh.loop_triangles:
            name = obj.material_slots[triangle.material_index].material.name
            bucket = by_material.setdefault(name, [])
            corners = []
            for loop_index in triangle.loops:
                co = matrix @ mesh.vertices[mesh.loops[loop_index].vertex_index].co
                normal = (rotation @ corner_normals[loop_index].vector).normalized()
                coord = uv_data[loop_index].uv
                corners.append(
                    (
                        round(co.x, 6), round(co.z, 6), round(-co.y, 6),
                        round(normal.x, 4), round(normal.z, 4), round(-normal.y, 4),
                        round(coord.x, 4), round(coord.y, 4),
                    )
                )
            bucket.append(corners)
        evaluated.to_mesh_clear()
    order = sorted(by_material, key=lambda name: (name == "Plastic", name))
    for name in order:
        start = len(indices)
        for corners in by_material[name]:
            for key in corners:
                full = (*key, name)
                if full not in lookup:
                    lookup[full] = len(positions) // 3
                    positions.extend(key[0:3])
                    normals.extend(key[3:6])
                    uvs.extend(key[6:8])
                indices.append(lookup[full])
        groups.append({"material": name, "start": start, "count": len(indices) - start})
    xs, ys, zs = positions[0::3], positions[1::3], positions[2::3]
    data = {
        "name": f"PokemonTCG_{builder.product}",
        "units": "meters",
        "size": [round(max(xs) - min(xs), 6), round(max(ys) - min(ys), 6), round(max(zs) - min(zs), 6)],
        "groups": groups,
        "position": positions,
        "normal": normals,
        "uv": uvs,
        "index": indices,
    }
    with open(os.path.join(MODEL_DIR, f"{kind}.json"), "w", encoding="utf-8") as handle:
        json.dump(data, handle, separators=(",", ":"))


def export_glb(builder):
    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    for obj in builder.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = builder.objects[0]
    path = os.path.join(EXPORT_DIR, f"PokemonTCG_{builder.product}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True)


def build_catalog():
    return [
        build_card(),
        build_single_pack(),
        build_sleeved_booster(),
        build_blister(
            "BlisterPack",
            0.158,
            0.192,
            packs=[(0.0335, -0.012, 0, 0.0)],
            promos=[(-0.0365, 0.008, 0)],
            coins=[(-0.0365, -0.058, 0.017)],
            bubbles=[(0.0, -0.014, 0.146, 0.142, 0.009)],
        ),
        build_blister(
            "2PackBlister",
            0.205,
            0.232,
            packs=[(0.012, -0.008, -4, 0.0), (0.048, -0.012, 4, 0.0055)],
            promos=[(-0.06, 0.02, 0)],
            coins=[(-0.06, -0.062, 0.02)],
            bubbles=[(0.0, -0.012, 0.193, 0.166, 0.014)],
        ),
        build_blister(
            "3PackBlister",
            0.200,
            0.296,
            packs=[(-0.044, 0.047, 6, 0.0), (0.044, 0.047, -6, 0.0), (0.0, 0.043, 0, 0.0055)],
            promos=[(-0.05, -0.088, 0)],
            coins=[(0.055, -0.088, 0.021)],
            bubbles=[(0.0, 0.045, 0.186, 0.142, 0.014), (0.0, -0.088, 0.186, 0.104, 0.008)],
        ),
        build_bundle(),
        build_lidded_box("ETB", 0.210, 0.183, 0.090, 0.065),
        build_lidded_box("PokemonCenterETB", 0.211, 0.186, 0.092, 0.065, sleeve=True),
        build_tin("Tin", 0.138, 0.188, 0.075, 0.014, TIN_SEGMENTS, 0.022, 0.0016),
        build_tin("MiniTin", 0.062, 0.099, 0.022, 0.009, MINI_TIN_SEGMENTS, 0.009, 0.0008),
        build_window_box(
            "CollectionBox",
            0.235,
            0.172,
            0.058,
            (0.05, 0.52, 0.12, 0.88),
            0.016,
            [("card", "CardStack", -0.034, -0.004, 2, 2), ("card", "PromoCard", -0.068, 0.004, -3, 1)],
        ),
        build_window_box(
            "SpecialCollectionBox",
            0.258,
            0.190,
            0.064,
            (0.05, 0.5, 0.1, 0.9),
            0.018,
            [("card", "PromoCard", -0.08, 0.008, -4, 2), ("coin", "Coin", -0.03, -0.045, 0, 0.022)],
        ),
        build_window_box(
            "PremiumCollectionBox",
            0.292,
            0.216,
            0.076,
            (0.04, 0.6, 0.08, 0.92),
            0.024,
            [
                ("card", "PromoCard", -0.098, 0.03, -3, 3),
                ("coin", "Coin", -0.03, -0.05, 0, 0.024),
                ("coin", "Accessory_01", 0.0, 0.045, 0, 0.016),
            ],
        ),
        build_window_box(
            "PosterCollection",
            0.300,
            0.225,
            0.036,
            (0.56, 0.95, 0.4, 0.92),
            0.01,
            [("card", "PromoCard", 0.075, 0.036, 3, 3)],
        ),
        build_lidded_box("LargePremiumBox", 0.380, 0.305, 0.105, 0.06, lid_thickness=0.0016),
        build_lidded_box("BoosterBox", 0.146, 0.140, 0.080, 0.72, lid_thickness=0.001),
    ]


def arrange_showcase(builders):
    columns = 6
    spacing = 0.42
    for index, builder in enumerate(builders):
        row, column = divmod(index, columns)
        offset = Matrix.Translation(Vector(((column - (columns - 1) / 2) * spacing, 0.0, -row * spacing))) @ Matrix.Rotation(math.radians(-24), 4, "Z")
        for obj in builder.objects:
            obj.matrix_world = offset @ obj.matrix_world


def build_preview(builders, path):
    scene = bpy.context.scene
    world = bpy.data.worlds.new("Studio")
    scene.world = world
    if world.node_tree is None:
        world.use_nodes = True
    background = next(node for node in world.node_tree.nodes if node.type == "BACKGROUND")
    background.inputs["Color"].default_value = (0.05, 0.05, 0.07, 1.0)
    background.inputs["Strength"].default_value = 1.0
    for name, energy, location, rotation in (
        ("Key", 260, (1.0, -1.6, 1.6), (math.radians(50), 0, math.radians(30))),
        ("Fill", 120, (-1.4, -1.2, 0.8), (math.radians(70), 0, math.radians(-45))),
        ("Rim", 160, (0.0, 1.6, 1.2), (math.radians(-60), 0, math.radians(180))),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = 1.5
        holder = bpy.data.objects.new(name, light)
        holder.location = location
        holder.rotation_euler = rotation
        scene.collection.objects.link(holder)
    camera_data = bpy.data.cameras.new("Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.65
    camera = bpy.data.objects.new("Camera", camera_data)
    camera.location = (0.0, -4.0, -0.42)
    camera.rotation_euler = (math.radians(90), 0, 0)
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 2000
    scene.render.resolution_y = 1000
    scene.view_settings.view_transform = "AgX"
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    preview = argv[argv.index("--preview") + 1] if "--preview" in argv else None
    for folder in (MODEL_DIR, EXPORT_DIR):
        os.makedirs(folder, exist_ok=True)
    reset_scene()
    builders = build_catalog()
    reports = []
    for builder in builders:
        dimensions = center_product(builder)
        reports.append(quality_report(builder, dimensions))
        export_json(builder, APP_KINDS[builder.product])
        export_glb(builder)
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(reports, handle, indent=1)
    for report in reports:
        target = report["target"]
        status = "OK" if not report["issues"] else "CHECK"
        print(f"{status:5} {report['product']:38} tris {report['triangles']:5} target {target} materials {report['materialCount']} size {report['sizeMm']}")
        for issue in report["issues"]:
            print(f"        - {issue}")
    arrange_showcase(builders)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    if preview:
        build_preview(builders, preview)


main()
