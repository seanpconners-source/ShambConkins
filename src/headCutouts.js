// Rendering only: the uploaded JPEG files stay byte-identical. Remove a dark
// backdrop connected to the image boundary, while preserving dark eyes/hair
// enclosed inside the head. Results are cached, never recomputed per frame.
const cache=new Map();
function clearEdgeBackdrop(rgba,width,height,threshold=28) {
 const count=width*height,visited=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0;
 const visit=n=>{if(n<0||n>=count||visited[n])return;visited[n]=1;const p=n*4;if(rgba[p+3]!==0&&Math.max(rgba[p],rgba[p+1],rgba[p+2])>threshold)return;queue[tail++]=n;};
 for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
 while(head<tail){const n=queue[head++],x=n%width;rgba[n*4+3]=0;if(x)visit(n-1);if(x<width-1)visit(n+1);visit(n-width);visit(n+width);}
 return rgba;
}
function headDisplayURL(src){return cache.get(src)||src;}
function createHeadCutout(image,src) {
 if(cache.has(src))return cache.get(src);
 if(!image.naturalWidth||!image.naturalHeight)return src;
 try{
  const ratio=Math.min(1,360/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);clearEdgeBackdrop(pixels.data,canvas.width,canvas.height);context.putImageData(pixels,0,0);
  const result=canvas.toDataURL('image/png');cache.set(src,result);return result;
 }catch{cache.set(src,src);return src;}
}
function floatingHead(element) {
 const svg=element.tagName?.toLowerCase()==='image',src=svg?element.getAttribute('href'):element.src;
 if(!src||src.startsWith('data:image/png'))return;
 const set=url=>{const current=svg?element.getAttribute('href'):element.src;if(current!==src||url===src)return;if(svg)element.setAttribute('href',url);else element.src=url;};
 if(cache.has(src)){set(cache.get(src));return;}
 if(!svg&&element.complete&&element.naturalWidth){set(createHeadCutout(element,src));return;}
 const image=new Image(),timer=setTimeout(()=>{image.onload=null;image.onerror=null;},5000);
 image.onload=()=>{clearTimeout(timer);set(createHeadCutout(image,src));};image.onerror=()=>clearTimeout(timer);image.src=src;
}

Object.assign(exports,{clearEdgeBackdrop,headDisplayURL,createHeadCutout,floatingHead});