/* Rank lookup against shipped distribution (sorted desc conservative scores, no names) */
window.VPARank={dist:null,load(b=''){return this.dist?Promise.resolve(this.dist):fetch(b+'assets/vpa-ranking-dist.json?v=202611091130').then(r=>r.json()).then(d=>this.dist=d)},
 of(score,g){const a=this.dist[g];let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;a[m]>score?lo=m+1:hi=m}return{rank:lo+1,n:a.length,pct:100*(1-lo/a.length)}}};
