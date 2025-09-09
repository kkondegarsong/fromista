// instagram-extract-script.js
// Instagram 미디어 추출 스크립트 (브라우저에서 실행됨)

function script(setting = { }) {
    try {
        console.log("[script] 시작");
        const { thumbnail = true } = setting; 

        // CPU 성능 체크
        let cpu = 100; // 기본값
        try {
            cpu = eval('cpu'.replace(/t80*(.+)/,'($1<110)?-1:$1*1.1-100').replace(/t60*(.+)/,'$1+40').replace(/[st].+/,'-1'));
        } catch(e) {
            cpu = 100;
        }
        
        const h = document.documentElement.innerHTML;
        console.log("[script] HTML:", h.length);
        
        // 로그인 필요 체크
        if (h.includes('"PolarisViewer",[],{"data":null')) {
            return { error: 'login_required', message: '로그인이 필요합니다' };
        }
        
        const input = window.location.href.replace(/\?.*/, '');
        console.log("[script] 현재 URL:", input);
        
        let murl = '!';
        // 메타태그에서 URL 추출 (정규식 사용)
        if (input.includes('/stories/') || input.includes('/s/')) {
            let og = document.querySelector('meta[property="og:url"]');
            if (og) murl = og.content;
        } else {
            let al = document.querySelector('meta[property="al:android:url"]');
            if (al) murl = al.content;
        }

        if (murl !== '!') {
            murl = murl
                    .replace(/\?.*/, '')
                    .replace(/(instagram\.com\/).+?\/(?=(?:p|tv|reel)\/)/, '$1');
        }

        console.log("[script] 메타 태그 url:", murl);
        if (murl.includes('com/stories/') && input.endsWith('.com/')) input = murl;
        if (murl !== input && !(murl.includes('com/stories/') && input.includes('com/stories/'))) {
            return { error: '', message: '' };
        }

        // instagram API 데이터 찾기
        const scripts = document.querySelectorAll('script');
        let jsonData = [];

        for (const script of scripts) {
            const match = script.textContent.includes('xdt_api__v1__media__shortcode__web_info') || 
                            script.textContent.includes('xdt_api__v1__feed__reels_media')

            if (match) {
                try {
                    // 스크립트 내용을 JSON 객체로 파싱합니다.
                    const parsedObject = JSON.parse(script.textContent);

                    // 파싱된 객체를 배열에 추가합니다.
                    jsonData.push(parsedObject);
                } catch (e) {
                    // JSON 파싱 오류가 발생하면 무시하고 다음 스크립트로 넘어갑니다.
                    continue;
                }
            }
        }  
        console.log("jsonData => ", jsonData);

        if (!jsonData || !jsonData[0]) {
            return {
                error: 'no_data',
                message: 'instagram 데이터를 찾을 수 없습니다',
                mobile: navigator.userAgent.includes('Mobile'),
                stories: input.includes('com/stories/')
            };
        }
        
        // 유틸리티 함수들
        const localDate = d => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().replace(/\....Z|:/g, '');
        const touchDate = s => s.slice(0,4) + s.slice(5,7) + s.slice(8,10) + s.slice(11,15) + '.' + s.slice(15);

        // 2025-09-05T05:00:11.000Z
        // 1단계: /[-:]/g로 - 와 : 를 _ 로 바꿈 → 2025_09_05T05_00_11.000Z
        // 2단계: T를 __로 바꿈 → 2025_09_05__05_00_11.000Z
        // 3단계: 000Z 부분 제거 → 2025_09_05__05_00_11
        const timestamp = d => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().replace(/[-:]/g, '_').replace('T', '__').slice(0, 19);
        
        // 최고 품질 이미지 선택
        const bestImage = (j, reels = false) => {
            if (!j || !j.image_versions2 || !j.image_versions2.candidates) {
                return '';
            }
            
            const ratio = j.original_width ? j.original_width / j.original_height : 0;
            const candidates = j.image_versions2.candidates;
            
            let bestImg = candidates.reduce((best, current) => {
                if (current.width >= best[1] && current.height > best[2]) {
                    const ratioMatch = !ratio || Math.abs(current.width/current.height - ratio) <= 0.01;
                    const reelsCheck = !reels || (current.width/current.height !== 1);
                    
                    if (ratioMatch && reelsCheck) {
                        return [current.url, current.width, current.height];
                    }
                }
                return best;
            }, ['', 0, 0])[0];
            
            // 조건에 맞는 이미지가 없으면 가장 큰 이미지 선택
            if (bestImg === '') {
                bestImg = candidates.reduce((best, current) => {
                    return (current.width >= best[1] && current.height > best[2]) ? 
                        [current.url, current.width, current.height] : best;
                }, ['', 0, 0])[0];
            }
            
            return bestImg;
        };
        
        // 최고 품질 비디오 선택
        const bestVideo = (v) => {
            if (!v) return '';
            
            const candidates = v.candidates || v;
            if (!Array.isArray(candidates)) return '';
            
            return candidates.reduce((best, current) => {
                if (current.width) {
                    return (current.width >= best[1] && current.height >= best[2]) ? 
                        [current.url, current.width, current.height, current.type] : best;
                } else {
                    return (current.type < best[3]) ? 
                        [current.url, current.width, current.height, current.type] : best;
                }
            }, ['', 0, 0, 9999])[0];
        };

        let j = null;
        for (const data of jsonData) {
            try {
                // 깊은 경로를 따라가서 최종 데이터 객체를 찾습니다.
                const r = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data;

                // resultData가 유효한 객체인지 확인합니다.
                if (r) {
                    // resultData의 키(key)를 반복하며 원하는 데이터가 있는지 확인합니다.
                    console.log("resultData => ", r)
                    j = r.xdt_api__v1__media__shortcode__web_info ??
                        r.xdt_api__v1__feed__reels_media__connection?.edges?.[0]?.node ??
                        r.xdt_api__v1__feed__reels_media?.reels_media?.[0];
                }
            } catch (e) {
                // 경로 탐색 중 오류가 발생하면 건너뜁니다.
                console.error("데이터 탐색 중 오류:", e);
                continue;
            }
            
            // j에 데이터가 할당되었으면 바깥 루프를 종료합니다.
            if (j) {
                break;
            }
        }
        
        if (!j) {
            return { error: 'parse_failed', message: 'instagram 데이터 파싱 실패' };
        }
        
        let out = { count: 0 };
        const m = input.match(/\/(p|tv|reel)\/([A-Za-z0-9_-]+)/) || input.match(/instagram\.com\/([^\/]+)(?:\/([A-Za-z0-9_-]+))?/);
        
        if (!m) {
            return { error: 'url_parse_failed', message: 'URL 파싱 실패' };
        }
        
        if (['p', 'tv', 'reel'].includes(m[1])) {
            console.log("[script] 게시물 데이터 처리 시작");
            // 게시물 처리
            out = { ...out, ispost: 1, urls: [], urls2: [], dates: [], tdates: [], vcount: 0 };            
            const post = j.items && j.items[0];
            if (!post) {
                return { error: 'no_post_data', message: '게시물 데이터 없음' };
            }
            
            out.user = post.user.username;
            
            // 미디어 아이템들 (캐러셀 또는 단일)
            const mediaItems = post.carousel_media || [post];
            
            out.urls = mediaItems.map(item => {
                let primaryUrl, fallbackUrl;
                
                if (item.video_versions) {
                    // 비디오 처리
                    out.vcount++;
                    fallbackUrl = bestVideo(item.video_versions);
                } else {
                    // 이미지 처리
                    fallbackUrl = bestImage(item);
                }
                
                out.urls2.push(fallbackUrl);
                return primaryUrl || fallbackUrl;
            });
            
            // 릴스/TV의 경우 커버 이미지 추가
            if (input.includes('/reel/') || input.includes('/tv/')) {
                if (thumbnail) {
                    const cover = bestImage(post, true);
                    if (cover) {
                        out.urls.unshift(cover);
                        out.urls2.unshift(cover);
                        out.reels = 1;
                    }
                }                
            }
            
            out.count = out.urls.length;
            console.log("[script] 총 미디어 개수:", out.count);
            
            // unix 타임스탬프를 Date 객체로 변환 (1000을 곱해서 밀리초 단위로 변환해야 함)
            // ex) 1756984811 * 1000
            const baseDate = post.taken_at ? new Date(1000 * post.taken_at) : new Date();
            out.dates = Array.from({ length: out.count }, (_, i) => 
                localDate(new Date(baseDate.getTime() + (i + 1) * 1000))
            );
            out.tdates = out.dates.map(d => touchDate(d));
            out.baseDate = timestamp(baseDate);
            
            // 캡션
            out.caption = input + '\\n' + 
                out.dates[0].replace(/T(..)(..)(..)/, ' $1:$2:$3  @') + 
                out.user + (post.caption ? '\\n' + post.caption.text : '');

        } else if (['stories', 's'].includes(m[1])) {
            console.log("[script] 스토리 데이터 처리 시작");
            out = { ...out, urls: [], urls2: [], dates: [], tdates: [], vcount: 0 };
            out.user = j.user.username;
            out.count = j.items.length;


            let sid = input.match(/\d{5,25}(?=\/?$)/)?.[0] + "_" + j.user.pk;
            let captions = [];

            j.items.sort((a, b) => a.taken_at - b.taken_at).forEach(a => {
                const baseDate = a.taken_at ? new Date(1000 * a.taken_at) : new Date();
                let d = timestamp(baseDate);
                let td = touchDate(d);
                let u, u2, u3, fftime;
                
                if (a.media_type === 1) {
                    u2 = bestImage(a);
                } else {
                    if (a.story_music_stickers) {
                        out.count++;
                        u3 = bestImage(a);
                        out.urls.push(u3);
                        out.urls2.push(u3);
                        out.dates.push(d);
                        out.tdates.push(td);
                    }
                    
                    let v = a.video_versions;
                    u2 = bestVideo(v);
                    out.vcount++;
                }
                
                let cap = a.caption || a.accessibility_caption;
                let caption;
                if (cap) {
                    caption = d.replace(/T(..)(..)(..)/, ' $1:$2:$3  @') + 
                             out.user + (cap ? '\\n' + cap : '');
                    captions.push(caption);
                }
                
                out.urls.push(u ?? u2);
                out.urls2.push(u2);
                out.dates.push(d);
                out.tdates.push(td);
                
                if (out.count > 1 && a.id === sid) {
                    if (u3) {
                        out.one = {
                            user: out.user, count: 1, vcount: 1, dates: [d, d], 
                            urls: [u3, u ?? u2], urls2: [u3, u2], 
                            tdates: [td, td], caption: caption
                        };
                    } else {
                        out.one = {
                            user: out.user, count: 0, vcount: 1, dates: [d], 
                            urls: [u ?? u2], urls2: [u2], 
                            tdates: [td], caption: caption
                        };
                    }
                    
                    if ((cpu !== -1) && a.video_dash_manifest?.includes('codecs="vp09')) {
                        out.one.switch = true;
                    }
                }
            });
            
            out.caption = captions.join('\\n\\n');
        }
        
        // 결과 검증
        if (!out.urls || out.urls.length === 0) {
            return { error: 'no_media', message: '미디어를 찾을 수 없습니다' };
        }
        
        // 빈 URL 제거
        out.urls = out.urls.filter(url => url && url.length > 0);
        out.urls2 = out.urls2.filter(url => url && url.length > 0);
        
        if (out.urls.length === 0) {
            return { error: 'empty_urls', message: '유효한 미디어 URL이 없습니다' };
        }
        
        console.log("[script] 완료");
        return out;
    } catch (error) {
        return {
            error: 'script_error',
            message: error.message,
            stack: error.stack
        };
    }
}


module.exports = script;