const tencentcloud = require("tencentcloud-sdk-nodejs");

// 腾讯混元配置 - 从云函数环境变量读取
const HUNYUAN_SECRET_ID = process.env.HUNYUAN_SECRET_ID || "";
const HUNYUAN_SECRET_KEY = process.env.HUNYUAN_SECRET_KEY || "";

const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;

// 初始化客户端
function initClient() {
  if (!HUNYUAN_SECRET_ID || !HUNYUAN_SECRET_KEY) {
    throw new Error("未配置腾讯混元密钥，请在云函数环境变量中设置 HUNYUAN_SECRET_ID 和 HUNYUAN_SECRET_KEY");
  }
  const clientConfig = {
    credential: {
      secretId: HUNYUAN_SECRET_ID,
      secretKey: HUNYUAN_SECRET_KEY,
    },
    region: "ap-beijing",
    profile: {
      httpProfile: {
        endpoint: "hunyuan.tencentcloudapi.com",
      },
    },
  };
  return new HunyuanClient(clientConfig);
}

function getMessageText(resp) {
  if (!resp) return "";
  if (resp.Choices && resp.Choices.length > 0) {
    const message = resp.Choices[0].Message;
    if (message && typeof message.Content === "string") return message.Content;
  }
  if (typeof resp.Response === "string") return resp.Response;
  return "";
}

async function invokeChat(client, params) {
  if (typeof client.ChatCompletions === "function") {
    return await client.ChatCompletions(params);
  }
  if (typeof client.ChatCompletion === "function") {
    return await client.ChatCompletion(params);
  }
  if (typeof client.ChatCompletionFullySupported === "function") {
    return await client.ChatCompletionFullySupported(params);
  }
  throw new Error("当前 tencentcloud-sdk-nodejs 版本不支持混元聊天接口，请升级后重新部署云函数");
}

function parseJsonResult(text) {
  const plain = (text || "").trim();
  if (!plain) throw new Error("AI返回为空");
  const fenced = plain.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : plain;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI响应中未找到JSON");
  return JSON.parse(jsonMatch[0]);
}

/**
 * AI优化食谱描述和步骤
 * @param {Array} ingredients 食材列表 [{name: '', amount: ''}]
 * @param {Array} steps 烹饪步骤数组
 * @param {String} description 原始描述
 * @returns {Promise<Object>} {description, steps}
 */
async function optimizeRecipe(ingredients, steps, description) {
  try {
    const client = initClient();
    
    const ingredientsList = ingredients
      .map(ing => `${ing.name}（${ing.amount}）`)
      .join("、");
    
    const prompt = `你是一位专业的家庭烹饪顾问。请帮我优化以下食谱：
    
【食材】${ingredientsList}

【现有步骤】
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

【现有描述】${description || "暂无"}

请你：
1. 保留全部食材
2. 优化烹饪步骤，使其更清晰、更易操作
3. 写一段吸引人的食谱描述（30-50字）

请按照以下JSON格式返回（只返回JSON，无其他内容）：
{
  "description": "优化后的描述",
  "steps": ["步骤1", "步骤2", "步骤3"]
}
步骤123仅代表真实步骤，不需要保留这个【步骤n】文字，请直接写优化后的步骤内容`;

    const params = {
      Messages: [
        {
          Role: "user",
          Content: prompt,
        },
      ],
      Model: "hunyuan-pro",
      TopP: 0.9,
      Temperature: 0.8,
    };

    const response = await invokeChat(client, params);
    const responseText = getMessageText(response);
    const result = parseJsonResult(responseText);
    return {
      ok: true,
      data: {
        description: result.description || "",
        steps: Array.isArray(result.steps) ? result.steps : steps
      }
    };
  } catch (error) {
    console.error("optimizeRecipe 错误:", error);
    throw error;
  }
}

/**
 * 基于食材推荐食谱
 * @param {Array<String>} ingredients 食材列表
 * @returns {Promise<Object>} {recipes: []}
 */
async function recommendRecipes(ingredients) {
  try {
    const client = initClient();
    
    const prompt = `你是一位家庭烹饪专家。用户有以下食材：${ingredients.join("、")}

请推荐3-5个简单易做的家庭菜谱，每个菜谱包含：1. 菜谱名称
2. 简短描述（20字以内）
3. 所需的额外食材（如有）

请按照以下JSON格式返回（只返回JSON，无其他内容）：
{
  "recipes": [
    {
      "title": "菜名",
      "description": "简描",
      "additionalIngredients": ["材料1", "材料2"]
    }
  ]
}`;

    const params = {
      Messages: [
        {
          Role: "user",
          Content: prompt,
        },
      ],
      Model: "hunyuan-pro",
      TopP: 0.9,
      Temperature: 0.7,
    };

    const response = await invokeChat(client, params);
    const responseText = getMessageText(response);
    const result = parseJsonResult(responseText);
    return {
      ok: true,
      data: {
        recipes: Array.isArray(result.recipes) ? result.recipes : []
      }
    };
  } catch (error) {
    console.error("recommendRecipes 错误:", error);
    throw error;
  }
}

/**
 * 回答烹饪问题
 * @param {String} question 用户问题
 * @returns {Promise<Object>} {answer: ''}
 */
async function answerCookingQuestion(question) {
  try {
    const client = initClient();

    const prompt = `你是一位资深的家庭烹饪专家。用户提出了以下烹饪相关的问题：

"${question}"

请给出简洁、实用的建议（不超过200字）。`;

    const params = {
      Messages: [
        {
          Role: "user",
          Content: prompt,
        },
      ],
      Model: "hunyuan-pro",
      TopP: 0.9,
      Temperature: 0.8,
    };

    const response = await invokeChat(client, params);
    const responseText = getMessageText(response);
    return {
      ok: true,
      data: { answer: responseText || "暂时没有可用回答" }
    };
  } catch (error) {
    console.error("answerCookingQuestion 错误:", error);
    throw error;
  }
}

async function healthCheck() {
  try {
    const client = initClient();
    const params = {
      Messages: [
        {
          Role: "user",
          Content: "请只回复：OK"
        }
      ],
      Model: "hunyuan-pro",
      TopP: 0.1,
      Temperature: 0.1
    };
    const response = await invokeChat(client, params);
    const responseText = getMessageText(response).trim();
    return {
      ok: true,
      data: {
        reachable: true,
        model: "hunyuan-pro",
        message: responseText || "OK"
      }
    };
  } catch (error) {
    return {
      ok: false,
      data: {
        reachable: false,
        model: "hunyuan-pro",
        message: error.message || "AI连通失败"
      }
    };
  }
}

module.exports = {
  optimizeRecipe,
  recommendRecipes,
  answerCookingQuestion,
  healthCheck,
};
