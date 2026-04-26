const example = async (m, { conn }) => {

await conn.sendButton(m.chat, {
  imageUrl: "https://i.pinimg.com/736x/f3/5d/2e/f35d2ed376e03aa254e7f34b4b94992e.jpg",
  bodyText: "Hello! This is the message text",
  footerText: "Footer text",
  buttons: [
    // 1. Quick Reply
    { name: "quick_reply", params: { display_text: "👍 Quick Reply", id: "quick1" } },
    { name: "quick_reply", params: { display_text: "👎 Another Reply", id: "quick2" } },
    
    // 2. URL Button
    { name: "cta_url", params: { display_text: "🔗 Google Link", url: "https://google.com" } },
    
    // 3. Call Button
    { name: "cta_call", params: { display_text: "📞 Call Support", phone_number: "201234567890" } },
    
    // 4. Copy Button
    { name: "cta_copy", params: { display_text: "📋 Copy Code", copy_code: "ABC123XYZ" } },
    
    // 5. Single Select Menu
    { name: "single_select", params: { 
      title: "📋 Choose Option",
      sections: [{
        title: "Menu",
        rows: [
          { title: "Option 1", description: "Description 1", id: "opt1" },
          { title: "Option 2", description: "Description 2", id: "opt2" }
        ]
      }]
    }},
    
    // 6. Call Permission Request
    { name: "call_permission_request", params: { 
      display_text: "📞 Request Call",
      phone_number: "201234567890",
      duration: 60
    }}
  ],
  mentions: [m.sender],
  newsletter: {
      name: '𝐕𝐈𝐈7 ~ 𝐂𝐡𝐚𝐧𝐧𝐞𝐥 🕷️',
      jid: '120363225356834044@newsletter'
    },
  interactiveConfig: {
    buttons_limits: 1, // لازم تبقي واحد
    list_title: "Available Options",
    button_title: "Click Here",
    canonical_url: "https://example.com"
  }
}, m);


};
example.usage = ["تست3"]
example.category = "example";
example.command = ["تست3"]
export default example;