export default function Logo() {
  return (
    <div 
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginRight: "12px",
        backgroundColor: "white",
        border: "1px solid #acc3e3"
      }}
    >
      <img 
        src="/logo-icon.jpg" 
        alt="Logo da Aplicação" 
        style={{ 
          height: "32px",
          width: "32px", 
          objectFit: "cover"
        }} 
      />
    </div>
  );
}
