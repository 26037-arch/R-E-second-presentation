"""Repeat supplied research algorithms; preserve inputs and all outcomes."""
import argparse, csv, hashlib, json, sys
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('mode', choices=['learning','deposition'])
parser.add_argument('--source', type=Path, required=True, help='Extracted wjd_source_e9bc3b0.zip')
parser.add_argument('--bundle', type=Path, required=True, help='Extracted k_iou_presentation_bundle.zip')
parser.add_argument('--output', type=Path, default=Path('outputs/repeats'))
args = parser.parse_args()
SRC = args.source.resolve()
DATA = SRC / 'docs/presentations/k_iou_2026-10-10/data'
MODELS = args.bundle.resolve() / 'outputs/axisymmetric_50/models'
OUT = args.output.resolve()
sys.path.insert(0, str(SRC))

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def deposition_job(job):
    run, angle = job
    import trimesh
    from conical.meshio import center_on_axis
    from conical.pipeline import generate_conical_gcode
    from tools.run_random_validation import internal_gcode_check
    from tools.external import volco_oriented
    from tools.external.volco_fast_kernel import nearest_empty
    from tools.external.validators import validate_volco_oriented, builtin_mesh_check
    from tools.deposition_iou_sweep import deposited_voxels, voxel_iou
    folder = OUT / 'deposition' / f'run-{run}' / f'outward-{angle}'
    folder.mkdir(parents=True, exist_ok=True)
    stl = MODELS / 'mushroom_03.stl'
    mesh = center_on_axis(trimesh.load(stl, force='mesh'))
    mesh_check = builtin_mesh_check(mesh)
    if not mesh_check['valid']:
        raise ValueError(mesh_check)
    path = folder / 'toolpath.gcode'
    generate_conical_gcode(mesh, angle, 'outward', path, layer_height=.3,
                          perimeters=2, infill_spacing=.45)
    syntax = internal_gcode_check(path)
    if not syntax['valid']:
        raise ValueError(syntax)
    volco_oriented._nearest_empty = nearest_empty
    result = validate_volco_oriented(path, folder, voxel_size=.3, step_size=.15)
    if result['status'] != 'OK':
        raise ValueError(result)
    rec = deposited_voxels(folder)
    phases = []
    for i in range(4):
        target = set(map(tuple, np.load(OUT / f'target-{i}.npz')['indices'].tolist()))
        phases.append(voxel_iou(target, rec, .3))
    intersection = float(np.mean([r['intersection'] for r in phases]))
    union = float(np.mean([r['union'] for r in phases]))
    rows = sorted(rec)
    occupancy_sha = hashlib.sha256(np.asarray(rows,dtype='<i4').tobytes()).hexdigest()
    row = dict(run=run, model_id='mushroom_03', angle_deg=angle, direction='outward',
               intersection=intersection, union=union, iou=intersection/union,
               voxel_size_mm=.3, step_size_mm=.15, voxel_count=len(rec),
               gcode_sha256=digest(path), occupancy_sha256=occupancy_sha,
               input_stl_sha256=digest(stl), syntax_valid=syntax['valid'], phases=phases)
    (folder/'repeat-result.json').write_text(json.dumps(row,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in row.items() if k!='phases'}),flush=True)
    return row

def deposition():
    import trimesh
    from conical.meshio import center_on_axis
    from tools.deposition_iou_sweep import target_voxels
    from tools.check_deposition_phases import PHASES
    OUT.mkdir(parents=True,exist_ok=True)
    mesh = center_on_axis(trimesh.load(MODELS/'mushroom_03.stl',force='mesh'))
    for i,phase in enumerate(PHASES):
        voxels = target_voxels(mesh,.3,phase)
        np.savez_compressed(OUT/f'target-{i}.npz',indices=np.array(sorted(voxels),dtype=np.int32))
    jobs=[(run,angle) for run in range(1,4) for angle in (0,10,12)]
    with ProcessPoolExecutor(max_workers=3) as pool:
        rows=list(pool.map(deposition_job,jobs))
    (OUT/'deposition-repeats.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
    with (OUT/'deposition-repeats.csv').open('w',newline='',encoding='utf-8') as f:
        fields=[k for k in rows[0] if k!='phases']
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
        w.writerows([{k:r[k] for k in fields} for r in rows])

def learning():
    from conical.k_learning.dataset import load_iou_records, prepare_dataset
    from tools.run_cumulative_k_learning import run_cumulative
    from tools.settle_cumulative_k import settle
    OUT.mkdir(parents=True,exist_ok=True)
    rows=list(csv.DictReader((DATA/'exact_iou.csv').open(encoding='utf-8')))
    for row in rows:
        row['stl_path']=str((MODELS/(row['model_id']+'.stl')).resolve())
    with (OUT/'exact_iou.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    dataset=prepare_dataset(load_iou_records(OUT/'exact_iou.csv'))
    summaries=[]
    for seed in (42,43,44):
        folder=OUT/'learning'/f'seed-{seed}'
        folder.mkdir(parents=True,exist_ok=True)
        # Only local path fields change. IoU values and hyperparameters stay fixed.
        (folder/'exact_iou.csv').write_bytes((OUT/'exact_iou.csv').read_bytes())
        cumulative=run_cumulative(dataset,folder/'cumulative',seed=seed,
             family_by_id={d.model_id:d.group_id for d in dataset})
        settled=settle(folder,max_updates=3000)
        summaries.append(dict(seed=seed,initial_k=.2,cumulative_updates=1000,
                              settling_updates=settled['updates'],converged=settled['converged'],
                              final_mean_k=settled['final_mean_k'],
                              max_k_drift=settled['last_window_max_k_drift'],
                              selected_angles_stable=settled['converged']))
    (OUT/'learning-repeats.json').write_text(json.dumps(summaries,indent=2),encoding='utf-8')
    print(json.dumps(summaries),flush=True)

if __name__=='__main__':
    if args.mode=='deposition': deposition()
    elif args.mode=='learning': learning()
