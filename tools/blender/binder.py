import math
import sys

import bpy
import bmesh
from mathutils import Vector

OUT = sys.argv[-2]
MODE = sys.argv[-1]

W = 0.25
H = 0.33
SLAB = 0.006
GAP = 0.034
SPINE_R = 0.024

COLORS = {
    'navy': (0.035, 0.07, 0.17),
    'crimson': (0.32, 0.025, 0.04),
    'aqua': (0.015, 0.28, 0.36),
    'onyx': (0.018, 0.018, 0.022),
    'violet': (0.13, 0.05, 0.28),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = -0.7
    world = bpy.data.worlds.new('World')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.7, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.22
    scene.world = world
    return scene


def material(name, color, roughness=0.5, metallic=0.0, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Coat Weight'].default_value = coat
    mat.diffuse_color = (*color, 1)
    return mat


def leather(name, color):
    mat = material(name, color, roughness=0.62, coat=0.15)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes['Principled BSDF']
    coords = nodes.new('ShaderNodeTexCoord')
    grain = nodes.new('ShaderNodeTexVoronoi')
    grain.inputs['Scale'].default_value = 520
    fine = nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 1400
    fine.inputs['Detail'].default_value = 6
    mix = nodes.new('ShaderNodeMath')
    mix.operation = 'ADD'
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = 0.0004
    links.new(coords.outputs['Object'], grain.inputs['Vector'])
    links.new(coords.outputs['Object'], fine.inputs['Vector'])
    links.new(grain.outputs['Distance'], mix.inputs[0])
    links.new(fine.outputs['Fac'], mix.inputs[1])
    links.new(mix.outputs['Value'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (0.5, 0.5, 0.5, 1)
    ramp.color_ramp.elements[1].color = (0.72, 0.72, 0.72, 1)
    links.new(fine.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Roughness'])
    return mat


def box(name, size, location, mat, bevel=0.004, segments=4):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = 'ANGLE'
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def stitches(name, center_y, inset, mat):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    left = -W / 2 + inset + 0.016
    right = W / 2 - inset
    bottom = -H / 2 + inset
    top = H / 2 - inset
    corners = [(left, bottom), (right, bottom), (right, top), (left, top)]
    pitch = 0.0055
    for index in range(4):
        start = Vector(corners[index])
        end = Vector(corners[(index + 1) % 4])
        length = (end - start).length
        count = int(length / pitch)
        direction = (end - start).normalized()
        for step in range(count):
            point = start + direction * (step + 0.5) * pitch
            geom = bmesh.ops.create_cube(bm, size=1.0)
            verts = geom['verts']
            along = 0.0032
            for vert in verts:
                local = Vector((vert.co.x * along, vert.co.y * 0.0009, vert.co.z * 0.0011))
                if abs(direction.x) < 0.5:
                    local = Vector((vert.co.z * 0.0011, vert.co.y * 0.0009, vert.co.x * along))
                vert.co = Vector((point.x + local.x, center_y + local.y, point.y + local.z))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def star(name, radius, depth, location, mat):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    points = []
    for index in range(8):
        angle = math.pi / 2 + index * math.pi / 4
        r = radius if index % 2 == 0 else radius * 0.28
        points.append(bm.verts.new((math.cos(angle) * r, 0, math.sin(angle) * r)))
    face = bm.faces.new(points)
    extruded = bmesh.ops.extrude_face_region(bm, geom=[face])
    for vert in [elem for elem in extruded['geom'] if isinstance(elem, bmesh.types.BMVert)]:
        vert.co.y -= depth
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.data.materials.append(mat)
    return obj


def ring(name, major, minor, location, rotation, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def label(text, size, location, mat):
    curve = bpy.data.curves.new(text, 'FONT')
    curve.body = text
    curve.size = size
    curve.extrude = 0.0004
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.space_character = 1.35
    obj = bpy.data.objects.new(text, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.radians(90), 0, 0)
    obj.data.materials.append(mat)
    return obj


def build(color_name):
    color = COLORS[color_name]
    cover = leather('Leather', color)
    trim = leather('Trim', tuple(channel * 0.6 for channel in color))
    thread = material('Thread', (0.85, 0.82, 0.74), roughness=0.8)
    foil = material('Foil', (1.0, 0.78, 0.38), roughness=0.42, metallic=1.0, coat=0.3)
    elastic = material('Elastic', (0.05, 0.62, 0.86), roughness=0.7)
    pages = material('Pages', (0.86, 0.9, 0.93), roughness=0.3, coat=0.6)

    parts = []
    front_y = -GAP / 2 - SLAB / 2
    back_y = GAP / 2 + SLAB / 2
    parts.append(box('Front', (W, SLAB, H), (0, front_y, 0), cover, bevel=0.0035))
    parts.append(box('Back', (W, SLAB, H), (0, back_y, 0), cover, bevel=0.0035))
    bpy.ops.mesh.primitive_cylinder_add(radius=SPINE_R, depth=H - 0.002, location=(-W / 2 + 0.004, 0, 0), vertices=48)
    spine = bpy.context.active_object
    spine.name = 'Spine'
    spine.scale = (0.62, 1.0, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    bevel = spine.modifiers.new('Bevel', 'BEVEL')
    bevel.width = 0.003
    bevel.segments = 3
    spine.data.materials.append(trim)
    bpy.ops.object.shade_smooth()
    parts.append(spine)
    parts.append(box('Pages', (W - 0.012, GAP - 0.002, H - 0.012), (0.003, 0, 0), pages, bevel=0.0015, segments=2))
    for index in range(10):
        offset = -GAP / 2 + 0.003 + index * (GAP - 0.006) / 9
        parts.append(box(f'Sleeve{index}', (W - 0.0115, 0.0006, H - 0.0115), (0.003, offset, 0), pages, bevel=0.0002, segments=1))
    strap_x = W / 2 - 0.042
    parts.append(box('StrapFront', (0.016, 0.0016, H + 0.0035), (strap_x, front_y - SLAB / 2 - 0.0008, 0), elastic, bevel=0.0006, segments=2))
    parts.append(box('StrapBack', (0.016, 0.0016, H + 0.0035), (strap_x, back_y + SLAB / 2 + 0.0008, 0), elastic, bevel=0.0006, segments=2))
    parts.append(box('StrapTop', (0.016, GAP + SLAB * 2 + 0.0032, 0.0016), (strap_x, 0, H / 2 + 0.0008), elastic, bevel=0.0006, segments=2))
    parts.append(box('StrapBottom', (0.016, GAP + SLAB * 2 + 0.0032, 0.0016), (strap_x, 0, -H / 2 - 0.0008), elastic, bevel=0.0006, segments=2))
    face_y = front_y - SLAB / 2
    parts.append(stitches('Stitches', face_y - 0.0003, 0.011, thread))
    parts.append(ring('Emblem', 0.034, 0.0016, (0.006, face_y - 0.0006, 0.035), (math.radians(90), 0, 0), foil))
    parts.append(star('Star', 0.024, 0.0012, (0.006, face_y + 0.0002, 0.035), foil))
    parts.append(label('PULLCHECK', 0.0145, (0.006, face_y - 0.0004, -0.045), foil))
    parts.append(label('COLLECTOR BINDER', 0.0068, (0.006, face_y - 0.0004, -0.064), foil))
    return parts


def lights(scene, target):
    def area(name, location, energy, size, color=(1, 1, 1)):
        data = bpy.data.lights.new(name, 'AREA')
        data.energy = energy
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = location
        direction = Vector(target) - obj.location
        obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        return obj

    area('Key', (0.55, -0.75, 0.6), 28, 0.6, (1.0, 0.97, 0.92))
    area('Fill', (-0.7, -0.5, 0.15), 7, 0.8, (0.85, 0.92, 1.0))
    area('Rim', (-0.2, 0.7, 0.55), 30, 0.5)
    area('Top', (0.0, -0.1, 0.9), 6, 0.9)


def camera(scene, location, target, lens=85, ortho=None):
    data = bpy.data.cameras.new('Camera')
    if ortho:
        data.type = 'ORTHO'
        data.ortho_scale = ortho
    else:
        data.lens = lens
    obj = bpy.data.objects.new('Camera', data)
    scene.collection.objects.link(obj)
    obj.location = location
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = obj
    return obj


def shadow_floor(scene, z):
    bpy.ops.mesh.primitive_plane_add(size=3, location=(0, 0, z))
    floor = bpy.context.active_object
    floor.is_shadow_catcher = True
    return floor


def render(scene, path, width, height):
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def turn(parts, degrees):
    pivot = bpy.data.objects.new('Pivot', None)
    bpy.context.collection.objects.link(pivot)
    for part in parts:
        part.parent = pivot
    pivot.rotation_euler.z = math.radians(degrees)


if MODE in ('hero', 'preview'):
    names = ['navy'] if MODE == 'preview' else list(COLORS)
    for name in names:
        scene = reset()
        if MODE == 'preview':
            scene.cycles.samples = 24
        turn(build(name), -28)
        shadow_floor(scene, -H / 2 - 0.0035)
        lights(scene, (0, 0, 0))
        camera(scene, (0.42, -0.92, 0.12), (0.0, 0.0, -0.01), lens=70)
        size = (450, 500) if MODE == 'preview' else (900, 1000)
        render(scene, f'{OUT}/binder-{name}.png', *size)
elif MODE == 'front':
    for name in COLORS:
        scene = reset()
        scene.cycles.samples = 64
        build(name)
        lights(scene, (0, 0, 0))
        camera(scene, (0.0, -1.2, 0.0), (0.0, 0.0, 0.0), ortho=H * 1.01)
        scene.render.pixel_aspect_x = 1
        render(scene, f'{OUT}/cover-{name}.png', int(760 * (W + SPINE_R) / H), 760)
elif MODE == 'glb':
    reset()
    build('navy')
    bpy.ops.export_scene.gltf(filepath=f'{OUT}/binder.glb', export_format='GLB', export_apply=True)
