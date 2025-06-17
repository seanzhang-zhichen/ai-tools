import request from '@/utils/request';

const nameGeneratorApi = {
  /**
   * 生成宝宝名字
   * @param {Object} params 
   * @param {string} params.surname - 宝宝姓氏
   * @param {string} params.gender - 宝宝性别 
   * @param {string} params.required_chars - 必须包含的汉字，可选
   * @param {string} params.additional_requirements - 其它命名要求，可选
   */
  generateNames(params) {
    return request({
      url: '/name/generate',
      method: 'POST',
      data: {
        surname: params.surname,
        gender: params.gender,
        required_chars: params.required_chars || undefined,
        additional_requirements: params.additional_requirements || undefined
      }
    });
  },

  /**
   * 获取用户信息，包含积分余额
   */
  getUserInfo() {
    return request({
      url: '/user/info',
      method: 'GET',
      skipAuthRedirect: true
    });
  },
  
  /**
   * 获取用户历史名字生成记录
   * @param {Object} params
   * @param {number} params.page - 页码，从1开始
   * @param {number} params.page_size - 每页记录数
   * @param {string} params.surname - 按姓氏筛选，可选
   * @param {string} params.gender - 按性别筛选，可选
   */
  getNameHistory(params = {}) {
    // 计算分页参数
    const skip = (params.page && params.page > 0) ? (params.page - 1) * (params.page_size || 10) : 0;
    const limit = params.page_size || 10;
    
    console.log("请求参数:", { skip, limit, surname: params.surname, gender: params.gender });
    
    return request({
      url: '/name/history',
      method: 'POST',
      data: {
        skip: skip,
        limit: limit,
        surname: params.surname || '',
        gender: params.gender || ''
      }
    });
  },
  
  /**
   * 获取用户历史生成过的所有唯一姓氏
   * 返回用户使用过的所有姓氏列表，用于筛选条件下拉框
   */
  getUniqueSurnames() {
    return request({
      url: '/name/surnames',
      method: 'GET'
    });
  }
};

export default nameGeneratorApi; 