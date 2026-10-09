"""Pandas + Matplotlib figures. Inputs are recorded research values, not CSS."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'assets/data'
FIG=ROOT/'assets/figures'
FIG.mkdir(parents=True,exist_ok=True)
font_path=Path('C:/Windows/Fonts/malgun.ttf')
if font_path.exists():
    font_manager.fontManager.addfont(str(font_path))
    font=font_manager.FontProperties(fname=str(font_path)).get_name()
else:
    font='DejaVu Sans'
plt.rcParams.update({'font.family':font,'axes.unicode_minus':False,
 'font.size':14,'axes.labelsize':15,'axes.titlesize':17,'xtick.labelsize':13,
 'ytick.labelsize':13,'axes.edgecolor':'#d4dbe8','axes.labelcolor':'#51617a',
 'text.color':'#18253d','xtick.color':'#67748b','ytick.color':'#67748b',
 'figure.facecolor':'white','axes.facecolor':'white','savefig.facecolor':'white'})

def clean(ax):
    ax.spines[['top','right']].set_visible(False)
    ax.grid(axis='y',color='#e9edf4',linewidth=.8)
    ax.set_axisbelow(True)

def convergence():
    df=pd.read_csv(DATA/'learning-traces.csv')
    summary=json.loads((DATA/'learning-repeats.json').read_text(encoding='utf-8'))
    fig,ax=plt.subplots(figsize=(9.0,3.8))
    clean(ax)
    colors={42:'#4262e9',43:'#218f87',44:'#c18d38'}
    for r in summary:
        d=df[(df.seed==r['seed'])&(df.phase=='fixed_50')].sort_values('total_update')
        ax.plot(d.total_update-1000,d.mean_k,lw=2.3,color=colors[r['seed']],
                label=f"seed {r['seed']} · 최종 평균 {r['final_mean_k']:.3f}")
        ax.scatter(d.total_update.iloc[-1]-1000,d.mean_k.iloc[-1],color=colors[r['seed']],s=28,zorder=4)
    ax.set(xlim=(0,600),ylim=(0,5.1),xlabel='50개 고정 후 추가 업데이트 수',ylabel='50개 STL에 대한 평균 k (%p/°)')
    ax.legend(loc='upper right',frameon=False,fontsize=12)
    fig.tight_layout(pad=1.1)
    fig.savefig(FIG/'k-convergence.png',dpi=220)
    plt.close(fig)
    # Also preserve the complete cumulative traces with no clipped values.
    fig,ax=plt.subplots(figsize=(10.8,5));clean(ax)
    for r in summary:
        d=df[df.seed==r['seed']].sort_values('total_update')
        ax.plot(d.total_update,d.mean_k,lw=2,color=colors[r['seed']],label=f"seed {r['seed']}")
    ax.axvline(1000,color='#9ba7bb',ls='--',label='50개 형상 고정')
    ax.set(xlabel='총 가중치 업데이트 수',ylabel='전체 50개 형상의 평균 k (%p/°)',ylim=(0,float(df.mean_k.max())*1.08))
    ax.legend(frameon=False);fig.tight_layout(pad=1.1)
    fig.savefig(FIG/'k-training-full.png',dpi=220);plt.close(fig)

def angle_iou():
    df=pd.read_csv(DATA/'angle-iou.csv')
    fig,ax=plt.subplots(figsize=(10.8,5.0)); clean(ax)
    for direction,color,label in [('outward','#4262e9','outward'),('inward','#a0afc6','inward')]:
        d=df[df.direction==direction].sort_values('angle_deg')
        ax.plot(d.angle_deg,100*d.iou,'o-',color=color,lw=2.2,ms=4,label=label)
    ax.axvline(0,color='#18253d',lw=1.8,ls=(0,(5,4)),label='학습 k 선택각 0°',zorder=4)
    selected=df[(df.angle_deg==0)&(df.direction=='outward')].iloc[0]
    peak=df.loc[df.iou.idxmax()]
    ax.scatter([selected.angle_deg,peak.angle_deg],[100*selected.iou,100*peak.iou],
               color=['#18253d','#218f87'],s=[65,65],zorder=5)
    ax.annotate(f'선택각 0°\n{100*selected.iou:.3f}%',xy=(0,100*selected.iou),
                xytext=(3.5,82),fontsize=13,color='#18253d',
                arrowprops=dict(arrowstyle='-',color='#9ba7bb',lw=.9))
    ax.annotate(f'측정 최대 {peak.angle_deg:g}°\n{100*peak.iou:.3f}%',
                xy=(peak.angle_deg,100*peak.iou),xytext=(18.5,95.1),fontsize=13,color='#218f87',
                arrowprops=dict(arrowstyle='-',color='#a9cbc6',lw=.9))
    ax.set(xlim=(-1.5,45.5),ylim=(50,100),xticks=[0,10,20,30,40,44],
           xlabel='원뿔각 θ (°)',ylabel='체적 IoU = 교집합 / 합집합 (%)')
    ax.legend(loc='lower left',frameon=False,fontsize=12,ncol=1)
    fig.tight_layout(pad=1.1)
    fig.savefig(FIG/'angle-iou.png',dpi=220)
    plt.close(fig)

if __name__=='__main__':
    convergence();angle_iou()
