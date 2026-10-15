/** Power v2: dimensionless game calibration, never official Dragon Ball BP.
 * logPower is log10(relative strength); 0 = Goku SSJ Namek benchmark.
 * No legacy BP/level/rank is used in decisions. */
export interface PowerProfile { version: 2; logPower: number | null; skill: number; stamina: number; speed: number; note: string; special?: string; }
export interface Entity { name: string; era: string; state: string; fusionId?: string; }
const clamp = (n:number,a:number,b:number) => Math.max(a,Math.min(b,n));
export const unknownPower = (note='Chưa có hồ sơ hiệu chỉnh cho tổ hợp này'):PowerProfile => ({version:2,logPower:null,skill:50,stamina:50,speed:50,note});
const profile=(p:number,note:string,skill=75,stamina=75,speed=75):PowerProfile=>({version:2,logPower:p,skill,stamina,speed,note});
export const ARCS: Record<string,{base:number;forms:string[]}> = {
 'DBZ · Namek / Frieza':{base:-1.699,forms:['Base','Super Saiyan']},
 'DBZ · Cell':{base:-1.0,forms:['Base','Super Saiyan','Super Saiyan 2']},
 'DBZ · Majin Buu':{base:-0.6,forms:['Base','Super Saiyan','Super Saiyan 2','Super Saiyan 3']},
 'DBS · Beerus':{base:-0.4,forms:['Base','Super Saiyan','Super Saiyan 2','Super Saiyan 3','Super Saiyan God']},
 'DBS · Golden Frieza':{base:1.0,forms:['Base','Super Saiyan','Super Saiyan God','Super Saiyan Blue']},
 'DBS · Goku Black':{base:1.3,forms:['Base','Super Saiyan','Super Saiyan God','Super Saiyan Blue']},
 'DBS · Giải đấu Sức mạnh':{base:1.6,forms:['Base','Super Saiyan','Super Saiyan God','Super Saiyan Blue','Super Saiyan Blue Kaioken x20','Ultra Instinct Sign','Ultra Instinct']},
 'DBS · Broly':{base:1.8,forms:['Base','Super Saiyan','Super Saiyan God','Super Saiyan Blue']}
};
const forms:Record<string,number>={'Base':0,'Super Saiyan':1.699,'Super Saiyan 2':2,'Super Saiyan 3':2.602,'Super Saiyan 4':3.3,'Great Ape':1,'Super Saiyan God':4,'Super Saiyan Blue':5,'Blue Evolution':5.7,'Super Saiyan Blue Kaioken x20':6.301,'Ultra Instinct Sign':6.5,'Ultra Instinct':7,'Ultra Ego':7,'Majin':2.05};
const bases:Record<string,number[]>={
 Goku:[-1,1.6],Vegeta:[-1.1,1.55],Gohan:[-1.2,1.3],Trunks:[-1.25,1],Piccolo:[-0.4,1.8],Frieza:[-2.45,2],Broly:[-0.5,3],
 'Android 17':[0.6,5.5],'Android 18':[0.5,2],Krillin:[-3.2,-2], 'Majin Buu':[2.2,2.4],Cell:[0.1,0.1],Hit:[6.4,6.4],Cabba:[0.3,0.3],Caulifla:[0.4,0.4],Kale:[0.5,0.5],Frost:[0,0],Jiren:[8.3,8.3],Toppo:[6.6,6.6],Dyspo:[5.8,5.8],Beerus:[10,10],Champa:[9.9,9.9],Belmod:[9.8,9.8],Whis:[12,12],Vados:[12,12],Marcarita:[12,12], 'Đại Thiên Sứ':[14,14],Zamasu:[2,2], 'Goku Black':[2,2],'Omega Shenron':[5,5], 'Baby (Kí sinh trùng)':[2,2], 'Người Phàm':[-7,-7]
};
const customForms:Record<string,Record<string,number>>={
 Gohan:{Ultimate:4,'Beast Mode':7.5}, Piccolo:{'Fused with Nail':0.35,'Fused with Kami':1.3,'Potential Unleashed':3.8,'Orange Form':6.3},
 Frieza:{'1st Form':0,'2nd Form':0.3,'3rd Form':0.6,'Final Form':2.1,'Full Power':2.35,'Golden Form':4.5,'Black Form':7.5},
 Broly:{Wrathful:1,'Legendary Super Saiyan':3,'Full Power Super Saiyan':5.7},
 Cell:{'First Form':0,'Semi-Perfect':0.6,'Perfect Form':1.2,'Super Perfect':1.55},
 'Majin Buu':{'Fat Buu':0,'Super Buu':0.4,'Kid Buu':0.15,'Buu (Gohan Absorbed)':0.9},
 'Goku Black':{'Super Saiyan Rosé':5},Trunks:{'Super Saiyan Rage':5.8},
 Hit:{'Full Power':0.3,'Time Skip Mastery':0.4},Jiren:{'Full Power':0.5},Toppo:{'God of Destruction Mode':2},Dyspo:{'Super Maximum Light Speed Mode':0.3},
 Zamasu:{'Fused Zamasu':5,'Fused Zamasu (Corrupted)':5.2},
 'Omega Shenron':{'Syn Shenron':0,'Omega Shenron (7 Dragons Absorbed)':0.8},
 'Baby (Kí sinh trùng)':{'Baby Form':0,'Baby Vegeta':0.6,'Super Baby 1':1,'Super Baby 2':1.4,'Golden Great Ape Baby':2.4},
 Kale:{'Super Saiyan (Berserk)':3,'Super Saiyan (Controlled)':3.2},Frost:{'1st Form':0,'3rd Form':0.6,'Final Form':2,'Full Power':2.2},
 Krillin:{'Potential Unlocked':0.3,'No Ego Zone':0.4},'Android 17':{'Ranger Mode':0}
};
export function stageForms(name:string,era:string){
 let list=[...(ARCS[era]?.forms||[])];
 if(name==='Goku'&&era==='DBZ · Cell')list=list.filter(x=>x!=='Super Saiyan 2');
 if(name==='Vegeta'){if(era==='DBZ · Namek / Frieza')return ['Base'];list=list.filter(x=>!/Super Saiyan 3|Instinct|Kaioken/.test(x));if(era==='DBS · Beerus')list=list.filter(x=>x!=='Super Saiyan God');if(era==='DBS · Giải đấu Sức mạnh')list.push('Blue Evolution');}
 return list;
}
export function standardPower(c:Entity):PowerProfile {
 if(['Zeno','Khởi Nguyên Thần','Hỗn Độn Thần'].includes(c.name)) return {...unknownPower('Quyền năng đặc biệt / nhân vật sáng tạo: không suy ra lực đánh từ quyền xóa sổ.'),special:'Ngoài thang đấu tay đôi'};
 const b=bases[c.name]; if(!b) return unknownPower();
 let era=c.era, note='Ước tính cân bằng game v2; không phải BP chính thức.';
 if(era==='Dragon Ball Z' && ['Goku','Vegeta'].includes(c.name)){era='DBZ · Majin Buu';note+=' Save cũ: DBZ quy ước cuối Buu; hãy chọn lại giai đoạn.';}
 if(era==='Dragon Ball Super' && ['Goku','Vegeta'].includes(c.name)){era='DBS · Giải đấu Sức mạnh';note+=' DBS mặc định Giải đấu Sức mạnh.';}
 let base=ARCS[era] && ['Goku','Vegeta'].includes(c.name)?ARCS[era].base+(c.name==='Vegeta'?-0.05:0):b[/Super|DBS/.test(era)?1:0];
 if(/Kid/.test(era))base-=c.name==='Goku'?5:1.4;
 if(/Teen/.test(era))base+=0.2;
 if(/Adult/.test(era))base+=0.5;
 if(/GT/.test(era)){base+=1.2;note+=' GT: dòng truyện riêng, quy đổi giả lập.';}
 if(/Xeno|Heroes/.test(era))return unknownPower('Heroes/Xeno chưa có hồ sơ riêng; không trộn với DBS.');
 if(ARCS[era] && ['Goku','Vegeta'].includes(c.name)) {
 const allowed=stageForms(c.name,era);
 if(!allowed.includes(c.state))return unknownPower('Dạng biến hình không có trong giai đoạn đã chọn.');
 }
 let modifier=customForms[c.name]?.[c.state]??forms[c.state];
 if(modifier===undefined){if(/Serious|nghiêm túc/.test(c.state))modifier=0.1;else if(c.state==='Suppressed')modifier=-2;else if(c.state==='Hakai Mode')modifier=0.2;else if(c.state.startsWith('Base'))modifier=0;else return unknownPower('Trạng thái chưa được hiệu chỉnh: '+c.state);}
 const stamina=/Kaioken|Super Saiyan 3|Berserk/.test(c.state)?45:/Instinct/.test(c.state)?60:80;
 const skill=c.name==='Goku'?94:c.name==='Vegeta'?90:c.name==='Hit'?96:/Whis|Vados|Marcarita/.test(c.name)?99:78;
 return profile(base+modifier,note,skill,stamina,c.name==='Dyspo'?99:/Instinct/.test(c.state)?98:80);
}
export function validPower(p:any):p is PowerProfile{return p?.version===2&&(p.logPower===null||(typeof p.logPower==='number'&&Number.isFinite(p.logPower)&&Math.abs(p.logPower)<=100))&&['skill','stamina','speed'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100)&&typeof p.note==='string';}
export function fusionPower(chars:Entity[],history:any[],upgrade?:any,seen=new Set<string>()):PowerProfile{
 const ps:PowerProfile[]=[];let adjustment=0;
 if(upgrade)ps.push(savedPower(upgrade,history,seen));
 for(const c of chars){
  if(!c || typeof c.name!=="string"){ps.push(unknownPower("Dữ liệu nguồn không hợp lệ"));continue;}
  if(c.fusionId){const f=history.find(f=>f.id===c.fusionId);ps.push(f?savedPower(f,history,seen):unknownPower('Thiếu thực thể nguồn'));continue;}
  const effects:Record<string,number>={'Tước đoạt':-2,'Đoạt linh hồn':-2,'Đoạt xác':-1,'Linh hồn':0.2,'Pin Infinity':0.2,'Sợi xích infinity':0.1,'DNA Saiyan':0.3,'DNA Hakai':1,'DNA Thiên sứ':1.5,'Thanh tẩy debuff':0.1,'Sinh mệnh vô hạn':0.3,'Máy Hút DNA':0};
  if(c.name in effects){adjustment+=effects[c.name];continue;}
  ps.push(standardPower(c));
 }
 if(!ps.length||ps.some(p=>p.logPower===null))return unknownPower('Thiếu hồ sơ nguồn hoặc vật phẩm chưa hiệu chỉnh; không dùng BP cũ để đoán.');
 const top=Math.max(...ps.map(p=>p.logPower!));
 const total=top+Math.log10(ps.reduce((s,p)=>s+10**(p.logPower!-top),0))+(ps.length>1?0.3:0)+adjustment;
 return profile(clamp(total,-100,100),'Ước tính dung hợp v2 từ các hồ sơ nguồn; hệ số game, không phải nguyên tác.',...(['skill','stamina','speed'] as const).map(k=>ps.reduce((s,p)=>s+p[k],0)/ps.length) as [number,number,number]);
}
export function savedPower(f:any,history:any[],seen=new Set<string>()):PowerProfile{
 if(validPower(f.powerProfile))return f.powerProfile;
 if(seen.has(f.id))return unknownPower('Vòng lặp nguồn dung hợp');
 const next=new Set(seen);next.add(f.id);
 const p=fusionPower(Array.isArray(f.baseCharacters)?f.baseCharacters:[],history,undefined,next);
 return {...p,note:'Chuyển từ save cũ theo nguồn nhân vật; '+p.note};
}
export const powerLabel=(p:PowerProfile)=>p.logPower===null?'Chưa định lượng':`${(100+p.logPower*10).toFixed(1)} PI`;
export const powerTier=(p:PowerProfile)=>p.special??(p.logPower===null?'Chưa hiệu chỉnh':p.logPower>=12?'Thiên sứ':p.logPower>=9?'Thần cấp':p.logPower>=5?'Thần khí':p.logPower>=2?'Siêu chiến binh':p.logPower>=0?'Chiến binh Namek+':'Chiến binh');
export function entityInfo(c:Entity,history:any[]){const f=c.fusionId?history.find(f=>f.id===c.fusionId):null;const p=c.fusionId?(f?savedPower(f,history):unknownPower('Nhân vật đã bị xóa')):standardPower(c);return {...c,powerProfile:p,formattedPower:powerLabel(p),formattedLevel:powerTier(p),rank:powerTier(p),description:p.note,imageUrl:f?.imageUrl};}
export function comparePower(a:ReturnType<typeof entityInfo>,b:ReturnType<typeof entityInfo>){
 const label=(c:typeof a)=>a.name===b.name?`${c.name} (${c.era} · ${c.state})`:c.name;
 const p=a.powerProfile,q=b.powerProfile;
 const known=p.logPower!==null&&q.logPower!==null;
 const delta=known?p.logPower!-q.logPower!:0;
 const skillDelta=(p.skill-q.skill)*0.002+(p.speed-q.speed)*0.002+(p.stamina-q.stamina)*0.001;
 const effective=delta+skillDelta;
 const tie=!known||Math.abs(effective)<0.025;
 const winnerChar=tie?0:effective>0?1:2;
 const prob1=known?Number(clamp(100/(1+10**(-effective)),0.1,99.9).toFixed(1)):50;
 const ratioText=known?`Ước tính lực thuần: ${Math.abs(delta)<0.001?'ngang nhau':`${delta>0?label(a):label(b)} ×${Math.abs(delta)<6?(10**Math.abs(delta)).toFixed(2):`10^${Math.abs(delta).toFixed(2)}`}`}`:'Chưa đủ dữ liệu; không đưa ra xác suất thắng.';
 return {known,winnerChar,expectedWinner:!known?'Chưa thể kết luận':tie?'Cân bằng':winnerChar===1?label(a):label(b),prob1:tie?50:prob1,prob2:tie?50:Number((100-prob1).toFixed(1)),ratioText,tierDisparity:known?'Mô phỏng game — không phải kết luận nguyên tác':'Cần bổ sung hồ sơ',ratio:10**Math.min(100,Math.abs(delta)),
 stats:{char1:{power:known?Number((100*10**Math.min(0,delta)).toFixed(2)):0,speed:p.speed,intelligence:p.skill,durability:p.stamina},char2:{power:known?Number((100*10**Math.min(0,-delta)).toFixed(2)):0,speed:q.speed,intelligence:q.skill,durability:q.stamina}}};
}
