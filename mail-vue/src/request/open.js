import http from '@/axios/index.js';

// 公开接口，不需要登录
export function openRecentMails(address) {
    return http.get('/open/recentMails', {params: {address}, noMsg: true})
}

export function openMailContent(emailId, address) {
    return http.get('/open/mailContent', {params: {emailId, address}, noMsg: true})
}

export function openDomains() {
    return http.get('/open/domains', {noMsg: true})
}
