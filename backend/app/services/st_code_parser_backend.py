import re
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import json

# ==================== 請求/回應 ====================
class STCodeRequest(BaseModel):
    code: str
    extract_type: str = "both"  # "variables", "logic", "both"

class Variable(BaseModel):
    class_name: str = "VAR"
    identifier: str
    address: str = ""
    var_type: str
    initial_value: str = ""
    comment: str = ""

class STCodeResponse(BaseModel):
    variables: Optional[List[Variable]] = None
    logic_code: Optional[str] = None
    raw_var_section: Optional[str] = None
    success: bool
    message: str = ""

# ==================== ST Code 解析器類別 ====================
class STCodeParser:
    """ST Code 解析器，從 ST Code 中提取變數和邏輯"""
    
    def __init__(self):
        # 變數宣告的正則表達式 - 參考爾諾的格式
        self.var_pattern = re.compile(
            r'^\s*(\w+(?:\s*,\s*\w+)*)\s*(AT\s+[%\w]+)?\s*:\s*(\w+(?:\s*\[.*\])?(?:\s*OF\s*\w+)?)\s*(:=?\s*(.*?))?\s*;\s*(//.*)?$',
            re.IGNORECASE | re.MULTILINE
        )
    
    def parse_st_code(self, st_code: str) -> tuple[str, str, str]:
        """
        解析 ST Code ，提取變數區塊和邏輯區塊
        
        Args:
            st_code: 完整的 ST 程式碼字串
            
        Returns:
            tuple: (清理後的程式碼, VAR 區塊內容, 邏輯區塊內容)
        """
        # 先清理 markdown 標記（如果有）
        clean_code = self._clean_markdown(st_code)
        
        # 提取 VAR 和邏輯區塊
        var_section, logic_code = self._extract_sections(clean_code)
        
        return clean_code, var_section, logic_code
    
    def _clean_markdown(self, code: str) -> str:
        """清除 markdown 程式碼標記"""
        # 尋找 ```st 或 ```python 或單純 ``` 包裹的程式碼
        code_blocks = re.findall(
            r"```(?:st|python|)?\s*(.*?)\s*```", 
            code, 
            re.DOTALL | re.IGNORECASE
        )
        
        # 如果找到程式碼區塊，取最後一個
        if code_blocks:
            return code_blocks[-1].strip()
        
        # 否則返回原始程式碼
        return code.strip()
    
    def _extract_sections(self, code: str) -> tuple[str, str]:
        """
        從 ST Code 中提取 VAR 區塊和邏輯區塊
        
        Returns:
            tuple: (VAR 區塊內容, 邏輯區塊內容)
        """
        var_start_match = re.search(r'VAR\s*', code, re.IGNORECASE)
        var_end_match = re.search(r'END_VAR\s*', code, re.IGNORECASE)
        
        var_section = ""
        logic_code = code
        
        # 如果找到完整的 VAR...END_VAR 區塊
        if var_start_match and var_end_match and var_start_match.start() < var_end_match.start():
            # 提取 VAR 內容（不含 VAR 和 END_VAR 關鍵字）
            var_section = code[var_start_match.end():var_end_match.start()].strip()
            # 提取邏輯部分（END_VAR 之後的所有內容）
            logic_code = code[var_end_match.end():].strip()
        
        return var_section, logic_code
    
    def parse_variables(self, var_section: str) -> List[Variable]:
        """
        解析 VAR 區塊，提取所有變數宣告
        
        Args:
            var_section: VAR 區塊的內容（不含 VAR/END_VAR）
            
        Returns:
            List[Variable]: 變數列表
        """
        if not var_section:
            return []
        
        variables = []
        
        # 逐行解析
        for line in var_section.splitlines():
            if not line.strip():
                continue
            
            match = self.var_pattern.match(line.strip())
            if not match:
                continue
            
            groups = match.groups()
            
            # 提取各個欄位
            identifiers_str = groups[0] or ''
            address = groups[1].strip() if groups[1] else ''
            var_type = groups[2].strip() if groups[2] else ''
            initial_value = groups[4].strip() if groups[4] else ''
            comment = groups[5].strip() if groups[5] else ''
            
            # 處理多個變數在同一行的情況（例如：a, b, c : INT）
            id_list = [i.strip() for i in identifiers_str.split(',') if i.strip()]
            
            for i, identifier in enumerate(id_list):
                # 初始值只套用到單一變數宣告
                applied_initial_value = initial_value if len(id_list) == 1 else ''
                # 註解只套用到該行最後一個變數
                applied_comment = comment if i == len(id_list) - 1 else ''
                
                variables.append(Variable(
                    class_name="VAR",
                    identifier=identifier,
                    address=address,
                    var_type=var_type,
                    initial_value=applied_initial_value,
                    comment=applied_comment
                ))
        
        return variables

# ==================== FastAPI  ====================
# 初始化
parser = STCodeParser()

def add_st_parser_routes(app: FastAPI):
    """將 ST 解析器路由加入現有的 FastAPI app"""
    
    @app.post("/api/parse_st_code", response_model=STCodeResponse)
    async def parse_st_code(request: STCodeRequest):
        """
        解析 ST 程式碼，提取變數和邏輯
        
        extract_type 可選值：
        - "variables": 只提取變數
        - "logic": 只提取邏輯程式碼
        - "both": 提取兩者（預設）
        """
        try:
            # 解析程式碼
            clean_code, var_section, logic_code = parser.parse_st_code(request.code)
            
            response = STCodeResponse(success=True)
            
            # 根據要求提取內容
            if request.extract_type in ["variables", "both"]:
                variables = parser.parse_variables(var_section)
                response.variables = variables
                response.raw_var_section = var_section
            
            if request.extract_type in ["logic", "both"]:
                response.logic_code = logic_code
            
            response.message = f"成功解析 ST 程式碼"
            return response
            
        except Exception as e:
            return STCodeResponse(
                success=False,
                message=f"解析失敗: {str(e)}"
            )
    
    @app.post("/api/export_variables_csv")
    async def export_variables_csv(request: STCodeRequest):
        """
        將變數匯出為 CSV 格式
        """
        try:
            _, var_section, _ = parser.parse_st_code(request.code)
            variables = parser.parse_variables(var_section)
            
            if not variables:
                raise HTTPException(status_code=400, detail="沒有找到變數宣告")
            
            # 轉換為 DataFrame
            df_data = [v.dict() for v in variables]
            df = pd.DataFrame(df_data)
            
            # 轉換為 CSV（使用 StringIO 在記憶體中處理）
            from io import StringIO
            csv_buffer = StringIO()
            df.to_csv(csv_buffer, index=False, encoding='utf-8')
            csv_content = csv_buffer.getvalue()
            
            return {
                "success": True,
                "csv_content": csv_content,
                "row_count": len(variables)
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
